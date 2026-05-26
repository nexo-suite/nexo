import { withUser, foodsCache, entries as entriesTable } from '@nexo/db';
import { and, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { logger } from './logger';
import { cleanBrand, cleanName } from './off-cleaners';

/**
 * OFF (Open Food Facts) integration. Direct fetch — no SDK.
 *
 * The official @openfoodfacts/openfoodfacts-nodejs SDK forces its own User-Agent and
 * doesn't expose free-text search, so we use raw fetch instead. This gives us:
 *  - A compliant User-Agent per https://openfoodfacts.github.io/openfoodfacts-server/api/
 *    (`AppName/Version (ContactEmail)`) — required to avoid being flagged as a bot.
 *  - Free-text search via search-a-licious + cgi/search.pl fallback.
 *  - Locale-aware lookups via the `lc` query param and language-specific subdomains.
 *
 * Rate limits are 15 req/min/IP for product reads and 10 req/min/IP for search; the
 * surrounding code (search endpoint + foods_search_cache) is responsible for staying
 * well under those.
 *
 * Environment selection (OFF_ENV):
 *  - `prod` (default) — hits production at *.openfoodfacts.org. Counts toward real
 *    rate limits and pollutes production telemetry.
 *  - `staging` — hits the OFF mirror at *.openfoodfacts.net with basic auth `off:off`.
 *    Recommended for dev. Mirror is read-only and may lag prod by hours.
 */

const USER_AGENT = 'Nexo-Calorie/1.0 (mail@krieger2501.de)';
const FETCH_TIMEOUT_MS = 4500;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

const OFF_ENV = (env.OFF_ENV ?? 'prod') as 'prod' | 'staging';
const HOST_DOMAIN = OFF_ENV === 'staging' ? 'openfoodfacts.net' : 'openfoodfacts.org';
const SEARCH_HOST = OFF_ENV === 'staging' ? 'search.openfoodfacts.net' : 'search.openfoodfacts.org';
const BASIC_AUTH = OFF_ENV === 'staging' ? `Basic ${btoa('off:off')}` : null;

export type Locale = 'en' | 'de' | 'tr';

const FIELDS: ReadonlyArray<string> = [
	'code',
	'product_name',
	'product_name_de',
	'product_name_en',
	'product_name_tr',
	'brands',
	'quantity',
	'serving_size',
	'serving_quantity',
	'image_front_small_url',
	'nutriments',
	'nutriscore_grade'
];

export type CachedFood = {
	source: 'cache' | 'off' | 'stale';
	barcode: string;
	name: string;
	brand: string | null;
	kcal100g: number | null;
	protein100g: number | null;
	carbs100g: number | null;
	fat100g: number | null;
	fiber100g: number | null;
	sugars100g: number | null;
	saturatedFat100g: number | null;
	salt100g: number | null;
	servingSizeG: number | null;
	imageUrl: string | null;
	fetchedAt: string;
};

/** Picks the best name for the user's locale, falling back gracefully. */
export function pickName(
	row: {
		nameDe: string | null;
		nameEn: string | null;
		nameTr: string | null;
		nameGeneric: string | null;
	},
	locale: Locale
): string {
	const byLocale = { en: row.nameEn, de: row.nameDe, tr: row.nameTr };
	return byLocale[locale] ?? row.nameEn ?? row.nameDe ?? row.nameGeneric ?? 'Unknown';
}

function num(v: unknown): number | null {
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	if (typeof v === 'string') {
		const n = Number(v);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function numStr(v: unknown): string | null {
	const n = num(v);
	return n == null ? null : String(n);
}

function toRow(barcode: string, p: Record<string, unknown>) {
	const n = (p.nutriments ?? {}) as Record<string, unknown>;
	return {
		barcode,
		nameDe: cleanName(p.product_name_de) ?? null,
		nameTr: cleanName(p.product_name_tr) ?? null,
		nameEn: cleanName(p.product_name_en) ?? null,
		nameGeneric: cleanName(p.product_name) ?? null,
		brand: cleanBrand(p.brands) ?? null,
		kcal100g: numStr(n['energy-kcal_100g']),
		protein100g: numStr(n.proteins_100g),
		carbs100g: numStr(n.carbohydrates_100g),
		fat100g: numStr(n.fat_100g),
		fiber100g: numStr(n.fiber_100g),
		sugars100g: numStr(n.sugars_100g),
		saturatedFat100g: numStr(n['saturated-fat_100g']),
		salt100g: numStr(n.salt_100g),
		servingSizeG: numStr(p.serving_quantity),
		imageUrl: (p.image_front_small_url as string | null) ?? null,
		rawOff: p as Record<string, unknown>
	};
}

function rowToFood(
	source: CachedFood['source'],
	row: typeof foodsCache.$inferSelect,
	locale: Locale
): CachedFood {
	return {
		source,
		barcode: row.barcode,
		name: pickName(row, locale),
		brand: row.brand,
		kcal100g: row.kcal100g != null ? Number(row.kcal100g) : null,
		protein100g: row.protein100g != null ? Number(row.protein100g) : null,
		carbs100g: row.carbs100g != null ? Number(row.carbs100g) : null,
		fat100g: row.fat100g != null ? Number(row.fat100g) : null,
		fiber100g: row.fiber100g != null ? Number(row.fiber100g) : null,
		sugars100g: row.sugars100g != null ? Number(row.sugars100g) : null,
		saturatedFat100g: row.saturatedFat100g != null ? Number(row.saturatedFat100g) : null,
		salt100g: row.salt100g != null ? Number(row.salt100g) : null,
		servingSizeG: row.servingSizeG != null ? Number(row.servingSizeG) : null,
		imageUrl: row.imageUrl,
		fetchedAt: row.fetchedAt.toISOString()
	};
}

/** Fetches with our User-Agent + abort timeout. Throws on non-2xx (caller decides recovery). */
async function offFetch(url: string): Promise<unknown> {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
	try {
		const headers: Record<string, string> = {
			'User-Agent': USER_AGENT,
			Accept: 'application/json'
		};
		if (BASIC_AUTH) headers.Authorization = BASIC_AUTH;
		const res = await fetch(url, { headers, signal: ctrl.signal });
		if (!res.ok) throw new Error(`OFF ${res.status} for ${url}`);
		return await res.json();
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Look up a product by barcode. Cache-first, then OFF, with stale-on-error fallback.
 *
 * Cache rule:
 *  - Cache hit AND user has logged this barcode in `entries` → return immediately, never refetch.
 *    Once a user consciously logged a food, refetching costs latency + rate budget for ~zero value.
 *  - Cache hit, no entries for this user → respect 30-day TTL.
 *  - Cache miss → fetch OFF.
 */
export async function lookupBarcode(
	userId: string,
	barcode: string,
	locale: Locale
): Promise<CachedFood | null> {
	if (!/^\d{8,14}$/.test(barcode)) {
		throw new Error('INVALID_BARCODE');
	}

	const [cached] = await withUser(userId, (tx) =>
		tx.select().from(foodsCache).where(eq(foodsCache.barcode, barcode)).limit(1)
	);

	if (cached) {
		const fresh = Date.now() - cached.fetchedAt.getTime() < TTL_MS;
		if (!fresh) {
			// Logged-forever rule: skip TTL refetch if the user has ever logged this barcode.
			const [logged] = await withUser(userId, (tx) =>
				tx
					.select({ id: entriesTable.id })
					.from(entriesTable)
					.where(and(eq(entriesTable.userId, userId), eq(entriesTable.foodBarcode, barcode)))
					.limit(1)
			);
			if (logged) {
				return rowToFood('cache', cached, locale);
			}
		} else {
			await withUser(userId, (tx) =>
				tx
					.update(foodsCache)
					.set({ lastAccessedAt: new Date() })
					.where(eq(foodsCache.barcode, barcode))
			);
			return rowToFood('cache', cached, locale);
		}
	}

	try {
		const url =
			`https://${locale}.${HOST_DOMAIN}/api/v3/product/${barcode}.json` +
			`?lc=${locale}&fields=${FIELDS.join(',')}`;
		const res = (await offFetch(url)) as { product?: Record<string, unknown>; status?: number };
		const product = res.product;
		const status = res.status;

		if (!product || status !== 1) {
			if (cached) return rowToFood('stale', cached, locale);
			return null;
		}

		const row = toRow(barcode, product);
		const inserted = await withUser(userId, async (tx) => {
			const [r] = await tx
				.insert(foodsCache)
				.values({ ...row, fetchedAt: new Date(), lastAccessedAt: new Date() })
				.onConflictDoUpdate({
					target: foodsCache.barcode,
					set: { ...row, fetchedAt: new Date(), lastAccessedAt: new Date() }
				})
				.returning();
			return r;
		});
		return rowToFood('off', inserted, locale);
	} catch (e) {
		logger.warn('off_fetch_failed', { barcode, error: String(e) });
		if (cached) return rowToFood('stale', cached, locale);
		throw e;
	}
}

/** Result row shape returned by `searchOff` — pre-cache, locale-resolved name not yet picked. */
export type OffSearchHit = ReturnType<typeof toRow>;

/**
 * Free-text search against OFF.
 *
 * Primary uses search-a-licious (beta as of 2026-05) at search.openfoodfacts.org.
 * Fallback to legacy cgi/search.pl on 5xx/timeout is intentional — search-a-licious
 * has cleaner langs support but isn't 1.0 yet, so we keep the older path warm.
 *
 * Throws when both primary AND fallback fail (network/timeout/5xx) — caller decides
 * how to surface the outage. Returns an empty array when OFF responded successfully
 * but had nothing to say. The two cases are different UX states ("retry" vs "no
 * matches, create your own?"), so don't conflate them.
 */
export async function searchOff(query: string, locale: Locale): Promise<OffSearchHit[]> {
	const q = query.trim();
	if (q.length < 3) return [];

	try {
		return await searchViaSearchALicious(q, locale);
	} catch (e) {
		logger.warn('off_search_alicious_failed', {
			error: String(e),
			locale,
			query: q
		});
		try {
			return await searchViaCgi(q, locale);
		} catch (e2) {
			logger.warn('off_search_failed', { error: String(e2), locale, query: q });
			throw e2;
		}
	}
}

async function searchViaSearchALicious(q: string, locale: Locale): Promise<OffSearchHit[]> {
	const fields = [
		'code',
		'product_name',
		'product_name_en',
		'product_name_de',
		'product_name_tr',
		'brands',
		'nutriments',
		'serving_quantity',
		'image_front_small_url'
	].join(',');
	// `states_tags:"en:nutrition-facts-completed"` filters to products OFF moderators
	// have confirmed have complete nutrition data — drops stub entries that have a
	// name but no usable kcal/macro values.
	const queryTerm = encodeURIComponent(`${q} states_tags:"en:nutrition-facts-completed"`);
	const url =
		`https://${SEARCH_HOST}/search?q=${queryTerm}` +
		`&langs=${locale},en&page_size=8&fields=${fields}`;
	const res = (await offFetch(url)) as { hits?: Array<Record<string, unknown>> };
	const hits = res.hits ?? [];
	return hits
		.map((p) => {
			const code = typeof p.code === 'string' ? p.code : null;
			if (!code) return null;
			return toRow(code, p);
		})
		.filter((r): r is OffSearchHit => r != null && hasUsableNutrition(r));
}

async function searchViaCgi(q: string, locale: Locale): Promise<OffSearchHit[]> {
	const url =
		`https://${locale}.${HOST_DOMAIN}/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
		`&search_simple=1&action=process&json=1&page_size=8&fields=${FIELDS.join(',')}` +
		`&states_tags=en:nutrition-facts-completed`;
	const res = (await offFetch(url)) as { products?: Array<Record<string, unknown>> };
	const products = res.products ?? [];
	return products
		.map((p) => {
			const code = typeof p.code === 'string' ? p.code : null;
			if (!code) return null;
			return toRow(code, p);
		})
		.filter((r): r is OffSearchHit => r != null && hasUsableNutrition(r));
}

function hasUsableNutrition(r: OffSearchHit): boolean {
	if (r.kcal100g == null) return false;
	if (!r.nameEn && !r.nameDe && !r.nameTr && !r.nameGeneric) return false;
	return true;
}

/**
 * Upsert a fetched OFF product into foods_cache and return the row.
 * Public so the search endpoint can persist hits returned from `searchOff`.
 */
export async function upsertCached(
	userId: string,
	row: OffSearchHit
): Promise<typeof foodsCache.$inferSelect> {
	const [r] = await withUser(userId, (tx) =>
		tx
			.insert(foodsCache)
			.values({ ...row, fetchedAt: new Date(), lastAccessedAt: new Date() })
			.onConflictDoUpdate({
				target: foodsCache.barcode,
				set: { ...row, fetchedAt: new Date(), lastAccessedAt: new Date() }
			})
			.returning()
	);
	return r!;
}
