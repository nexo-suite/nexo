import { json } from '@sveltejs/kit';
import {
	withUser,
	userFoods,
	entries as entriesTable,
	foodsCache,
	foodsSearchCache
} from '@nexo/db';
import { and, eq, ilike, or, desc, gt, inArray } from 'drizzle-orm';
import { logger } from '$lib/server/logger';
import { searchOff, upsertCached, pickName, type Locale } from '$lib/server/off';
import { SEED_FOODS, type SeedFood } from '$lib/server/seed-foods';
import { getLocale } from '$lib/paraglide/runtime.js';
import type { RequestHandler } from './$types';

const QUERY_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Diacritic-insensitive, German-folded normalization. Used for both the OFF query
 * cache key and seed-bundle name fuzzy match. Means "Müsli", "Muesli", "musli",
 * "MÜSLI" all collapse to the same cache entry and match the same seed row.
 */
function normalize(s: string): string {
	return s
		.trim()
		.toLocaleLowerCase()
		.replace(/ß/g, 'ss')
		.replace(/ä/g, 'a')
		.replace(/ö/g, 'o')
		.replace(/ü/g, 'u')
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '');
}

type SearchResult = {
	id: string;
	source: 'user' | 'cache' | 'seed' | 'off';
	name: string;
	brand: string | null;
	kcal100g: number | null;
	protein100g: number | null;
	carbs100g: number | null;
	fat100g: number | null;
	fiber100g: number | null;
	sugars100g: number | null;
	nutriScoreGrade: string | null;
	servingSizeG: number | null;
};

function seedToResult(s: SeedFood, locale: Locale): SearchResult {
	return {
		id: s.id,
		source: 'seed',
		name: s.names[locale],
		brand: null,
		kcal100g: s.kcal100g,
		protein100g: s.protein100g,
		carbs100g: s.carbs100g,
		fat100g: s.fat100g,
		fiber100g: s.fiber100g ?? null,
		sugars100g: s.sugars100g ?? null,
		nutriScoreGrade: null,
		servingSizeG: null
	};
}

function cacheRowToResult(c: typeof foodsCache.$inferSelect, locale: Locale): SearchResult {
	// nutriScoreGrade isn't its own column — pull from rawOff JSON when present.
	const raw = (c.rawOff ?? {}) as Record<string, unknown>;
	const grade = typeof raw.nutriscore_grade === 'string' ? raw.nutriscore_grade : null;
	return {
		id: c.barcode,
		source: 'cache',
		name: pickName(c, locale),
		brand: c.brand,
		kcal100g: c.kcal100g != null ? Number(c.kcal100g) : null,
		protein100g: c.protein100g != null ? Number(c.protein100g) : null,
		carbs100g: c.carbs100g != null ? Number(c.carbs100g) : null,
		fat100g: c.fat100g != null ? Number(c.fat100g) : null,
		fiber100g: c.fiber100g != null ? Number(c.fiber100g) : null,
		sugars100g: c.sugars100g != null ? Number(c.sugars100g) : null,
		nutriScoreGrade: grade && /^[a-eA-E]$/.test(grade) ? grade.toLowerCase() : null,
		servingSizeG: c.servingSizeG != null ? Number(c.servingSizeG) : null
	};
}

export const GET: RequestHandler = async ({ url, locals }) => {
	const userId = locals.user!.id;
	const q = (url.searchParams.get('q') ?? '').trim();
	const wantGlobal = url.searchParams.get('global') === '1';
	const locale = getLocale() as Locale;

	if (q.length < 2) return json({ results: [], hasMore: false, globalError: false });

	const qNorm = normalize(q);
	const pattern = `%${q}%`;

	// Local tier: user-owned foods + cache rows the user has previously logged.
	const localData = await withUser(userId, async (tx) => {
		const own = await tx
			.select()
			.from(userFoods)
			.where(
				and(
					eq(userFoods.userId, userId),
					or(ilike(userFoods.name, pattern), ilike(userFoods.brand, pattern))
				)
			)
			.orderBy(desc(userFoods.createdAt))
			.limit(20);

		const cachedHits = await tx
			.select({ row: foodsCache })
			.from(foodsCache)
			.innerJoin(
				entriesTable,
				and(eq(entriesTable.foodBarcode, foodsCache.barcode), eq(entriesTable.userId, userId))
			)
			.where(
				or(
					ilike(foodsCache.nameDe, pattern),
					ilike(foodsCache.nameEn, pattern),
					ilike(foodsCache.nameTr, pattern),
					ilike(foodsCache.nameGeneric, pattern),
					ilike(foodsCache.brand, pattern)
				)
			)
			.groupBy(foodsCache.barcode)
			.limit(20);

		return { own, cachedHits: cachedHits.map((c) => c.row) };
	});

	const ownResults: SearchResult[] = localData.own.map((f) => ({
		id: f.id,
		source: 'user' as const,
		name: f.name,
		brand: f.brand,
		kcal100g: Number(f.kcal100g),
		protein100g: Number(f.protein100g),
		carbs100g: Number(f.carbs100g),
		fat100g: Number(f.fat100g),
		fiber100g: f.fiber100g != null ? Number(f.fiber100g) : null,
		sugars100g: f.sugars100g != null ? Number(f.sugars100g) : null,
		nutriScoreGrade: null,
		servingSizeG: null
	}));
	const cacheResults: SearchResult[] = localData.cachedHits.map((c) => cacheRowToResult(c, locale));

	// Seed tier: filter the bundle by normalized substring match in user's locale.
	const seedResults: SearchResult[] = SEED_FOODS.filter((s) =>
		normalize(s.names[locale]).includes(qNorm)
	).map((s) => seedToResult(s, locale));

	const localCount = ownResults.length + cacheResults.length + seedResults.length;
	const shouldCallOff = q.length >= 3 && (localCount < 3 || wantGlobal);

	let offResults: SearchResult[] = [];
	let globalError = false;

	if (shouldCallOff) {
		try {
			offResults = await getOrFetchOffResults(userId, q, qNorm, locale);
		} catch (e) {
			globalError = true;
			logger.warn('search_off_path_failed', {
				error: String(e),
				correlationId: locals.correlationId,
				q: qNorm
			});
		}
	}

	// Dedupe: user history wins; seed never has barcodes so never collides.
	const seenBarcodes = new Set<string>();
	for (const r of cacheResults) seenBarcodes.add(r.id);
	const filteredOff = offResults.filter((r) => !seenBarcodes.has(r.id));

	const results = [...ownResults, ...cacheResults, ...seedResults, ...filteredOff];

	const hasMore = !shouldCallOff && localCount >= 3;

	logger.debug('search_results', {
		user: ownResults.length,
		cache: cacheResults.length,
		seed: seedResults.length,
		off: filteredOff.length,
		locale,
		q: qNorm,
		hasMore,
		globalError,
		correlationId: locals.correlationId
	});

	return json({ results, hasMore, globalError });
};

/**
 * 30-day query cache for OFF free-text searches. Hit → SELECT cached barcodes
 * from foods_cache. Miss → call OFF, upsert each hit, write the (query, locale)
 * → barcodes mapping for future requests.
 */
async function getOrFetchOffResults(
	userId: string,
	q: string,
	qNorm: string,
	locale: Locale
): Promise<SearchResult[]> {
	const ttlCutoff = new Date(Date.now() - QUERY_CACHE_TTL_MS);

	const [cached] = await withUser(userId, (tx) =>
		tx
			.select()
			.from(foodsSearchCache)
			.where(
				and(
					eq(foodsSearchCache.queryNormalized, qNorm),
					eq(foodsSearchCache.locale, locale),
					gt(foodsSearchCache.fetchedAt, ttlCutoff)
				)
			)
			.limit(1)
	);

	if (cached) {
		if (cached.barcodes.length === 0) return [];
		const rows = await withUser(userId, (tx) =>
			tx.select().from(foodsCache).where(inArray(foodsCache.barcode, cached.barcodes))
		);
		return rows.map((r) => ({ ...cacheRowToResult(r, locale), source: 'off' as const }));
	}

	const hits = await searchOff(q, locale);
	const upserted = await Promise.all(hits.map((h) => upsertCached(userId, h)));
	const barcodes = upserted.map((r) => r.barcode);

	await withUser(userId, (tx) =>
		tx
			.insert(foodsSearchCache)
			.values({ queryNormalized: qNorm, locale, barcodes, fetchedAt: new Date() })
			.onConflictDoUpdate({
				target: [foodsSearchCache.queryNormalized, foodsSearchCache.locale],
				set: { barcodes, fetchedAt: new Date() }
			})
	);

	return upserted.map((r) => ({ ...cacheRowToResult(r, locale), source: 'off' as const }));
}
