import {
	db,
	flaschenPrefs,
	flaschenSeenOffer,
	flaschenSeenLocation,
	type FlaschenDateOverride,
	type FlaschenPrefs,
	type ShiftOfferPayload
} from '@nexo/db';
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { dedupeKey, matchesWindow, withinLengthRange, meetsAdvanceNotice } from './match';

const DEFAULT_PREFS: Omit<FlaschenPrefs, 'userId' | 'updatedAt'> = {
	enabled: true,
	weeklyWindows: {
		'1': [{ start: 420, end: 1380 }],
		'2': [{ start: 420, end: 1380 }],
		'3': [{ start: 420, end: 1380 }],
		'4': [{ start: 420, end: 1380 }],
		'5': [{ start: 420, end: 1380 }],
		'6': [{ start: 420, end: 1380 }],
		'7': []
	},
	warehouseIds: [3],
	workgroupIds: [1],
	shiftMinMinutes: 0,
	shiftMaxMinutes: 360,
	advanceNoticeMinutes: 0,
	includeMarketplace: true,
	quietHoursEnabled: false,
	quietStartMinutes: 1320,
	quietEndMinutes: 360
};

export async function loadPrefs(userId: string): Promise<FlaschenPrefs> {
	const rows = await db
		.select()
		.from(flaschenPrefs)
		.where(eq(flaschenPrefs.userId, userId))
		.limit(1);
	if (rows[0]) return rows[0];
	const inserted = await db
		.insert(flaschenPrefs)
		.values({ userId, ...DEFAULT_PREFS })
		.returning();
	return inserted[0];
}

export async function savePrefs(
	userId: string,
	patch: Partial<Omit<FlaschenPrefs, 'userId' | 'updatedAt'>>
): Promise<FlaschenPrefs> {
	await loadPrefs(userId); // ensure row exists
	const updated = await db
		.update(flaschenPrefs)
		.set({ ...patch, updatedAt: new Date() })
		.where(eq(flaschenPrefs.userId, userId))
		.returning();
	return updated[0];
}

export type ReconcileResult = {
	totalOffers: number;
	newOffers: number;
	newMatches: number;
	matchedOffers: ShiftOfferPayload[];
};

const UPSERT_CHUNK_SIZE = 100;

/** Insert previously unseen offers, mark which match the user's prefs, and
 *  return the freshly matched ones so the caller can send notifications. */
export async function reconcileOffers(
	userId: string,
	prefs: FlaschenPrefs,
	overrides: FlaschenDateOverride[],
	offers: ShiftOfferPayload[]
): Promise<ReconcileResult> {
	const matchedOffers: ShiftOfferPayload[] = [];

	const liveKeys = offers.map(dedupeKey);
	if (liveKeys.length === 0) {
		await db
			.update(flaschenSeenOffer)
			.set({ stillAvailable: false })
			.where(eq(flaschenSeenOffer.userId, userId));
	} else {
		await db
			.update(flaschenSeenOffer)
			.set({ stillAvailable: false })
			.where(
				and(eq(flaschenSeenOffer.userId, userId), notInArray(flaschenSeenOffer.dedupeKey, liveKeys))
			);
	}

	if (offers.length === 0) {
		return { totalOffers: 0, newOffers: 0, newMatches: 0, matchedOffers };
	}

	type Computed = {
		offer: ShiftOfferPayload;
		key: string;
		isStrictMatch: boolean;
		isBorderline: boolean;
	};
	const computed: Computed[] = offers.map((offer) => {
		const inWindow = matchesWindow(prefs, overrides, offer);
		const okLength = withinLengthRange(prefs, offer);
		const okNotice = meetsAdvanceNotice(prefs, offer);
		const isStrictMatch = inWindow && okLength && okNotice;
		const isBorderline = inWindow && !isStrictMatch;
		return { offer, key: dedupeKey(offer), isStrictMatch, isBorderline };
	});

	let newOffers = 0;
	let newMatches = 0;
	const now = new Date();

	for (let i = 0; i < computed.length; i += UPSERT_CHUNK_SIZE) {
		const chunk = computed.slice(i, i + UPSERT_CHUNK_SIZE);
		const rows = chunk.map((c) => ({
			userId,
			dedupeKey: c.key,
			offer: c.offer,
			matched: c.isStrictMatch,
			borderline: c.isBorderline,
			notified: false,
			stillAvailable: true
		}));
		const result = await db
			.insert(flaschenSeenOffer)
			.values(rows)
			.onConflictDoUpdate({
				target: [flaschenSeenOffer.userId, flaschenSeenOffer.dedupeKey],
				set: {
					lastSeenAt: now,
					offer: sql`excluded.offer`,
					matched: sql`excluded.matched`,
					borderline: sql`excluded.borderline`,
					stillAvailable: true
				}
			})
			.returning({
				dedupeKey: flaschenSeenOffer.dedupeKey,
				notified: flaschenSeenOffer.notified,
				inserted: sql<boolean>`(xmax = 0)`
			});

		const byKey = new Map(result.map((r) => [r.dedupeKey, r]));
		for (const c of chunk) {
			const row = byKey.get(c.key);
			if (!row) continue;
			if (row.inserted === true) newOffers++;
			// Notify on first sighting OR when an already-stored offer is now a
			// match but hasn't been pushed yet (e.g., user added an "available"
			// override that flips the offer to matching).
			if (c.isStrictMatch && !row.notified) {
				newMatches++;
				matchedOffers.push(c.offer);
			}
		}
	}

	await rememberLocations(userId, offers);

	return {
		totalOffers: offers.length,
		newOffers,
		newMatches,
		matchedOffers
	};
}

/** Mark a set of offers as successfully notified. Called by the worker after
 *  push delivery so a failed push retries on the next tick. */
export async function markOffersNotified(userId: string, dedupeKeys: string[]): Promise<void> {
	if (dedupeKeys.length === 0) return;
	await db
		.update(flaschenSeenOffer)
		.set({ notified: true })
		.where(
			and(eq(flaschenSeenOffer.userId, userId), inArray(flaschenSeenOffer.dedupeKey, dedupeKeys))
		);
}

/** Re-evaluate the matched/borderline flags of every still-available stored
 *  offer against the current prefs+overrides without making an API call. Used
 *  after the user changes filter prefs or date overrides so the dashboard
 *  reflects the new logic immediately, not after the next worker poll. */
export async function recomputeMatchedFlags(
	userId: string,
	prefs: FlaschenPrefs,
	overrides: FlaschenDateOverride[]
): Promise<void> {
	const rows = await db
		.select({ id: flaschenSeenOffer.id, offer: flaschenSeenOffer.offer })
		.from(flaschenSeenOffer)
		.where(and(eq(flaschenSeenOffer.userId, userId), eq(flaschenSeenOffer.stillAvailable, true)));

	for (const r of rows) {
		const inWindow = matchesWindow(prefs, overrides, r.offer);
		const okLength = withinLengthRange(prefs, r.offer);
		const okNotice = meetsAdvanceNotice(prefs, r.offer);
		const isStrictMatch = inWindow && okLength && okNotice;
		const isBorderline = inWindow && !isStrictMatch;
		await db
			.update(flaschenSeenOffer)
			.set({ matched: isStrictMatch, borderline: isBorderline })
			.where(eq(flaschenSeenOffer.id, r.id));
	}
}

async function rememberLocations(userId: string, offers: ShiftOfferPayload[]): Promise<void> {
	const seen = new Map<string, ShiftOfferPayload>();
	for (const o of offers) {
		const k = `${o.warehouse.warehouseId}|${o.workgroup.workgroupId}`;
		if (!seen.has(k)) seen.set(k, o);
	}
	for (const o of seen.values()) {
		await db
			.insert(flaschenSeenLocation)
			.values({
				userId,
				warehouseId: o.warehouse.warehouseId,
				warehouseName: o.warehouse.name,
				workgroupId: o.workgroup.workgroupId,
				workgroupName: o.workgroup.name
			})
			.onConflictDoUpdate({
				target: [
					flaschenSeenLocation.userId,
					flaschenSeenLocation.warehouseId,
					flaschenSeenLocation.workgroupId
				],
				set: {
					warehouseName: o.warehouse.name,
					workgroupName: o.workgroup.name,
					lastSeenAt: new Date()
				}
			});
	}
}
