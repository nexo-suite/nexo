import {
	db,
	flaschenPrefs,
	flaschenSeenOffer,
	flaschenSeenLocation,
	type FlaschenDateOverride,
	type FlaschenPrefs,
	type ShiftOfferPayload
} from '@nexo/db';
import { eq, sql } from 'drizzle-orm';
import { dedupeKey, matchesWindow, withinMaxLength } from './match';

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
	shiftMaxMinutes: 360,
	includeMarketplace: true
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

/** Insert previously unseen offers, mark which match the user's prefs, and
 *  return the freshly matched ones so the caller can send notifications. */
export async function reconcileOffers(
	userId: string,
	prefs: FlaschenPrefs,
	overrides: FlaschenDateOverride[],
	offers: ShiftOfferPayload[]
): Promise<ReconcileResult> {
	const matchedOffers: ShiftOfferPayload[] = [];
	let newOffers = 0;
	let newMatches = 0;

	for (const offer of offers) {
		const key = dedupeKey(offer);
		const inWindow = matchesWindow(prefs, overrides, offer);
		const okLength = withinMaxLength(prefs, offer);
		const isStrictMatch = inWindow && okLength;
		const isBorderline = inWindow && !okLength;

		const result = await db
			.insert(flaschenSeenOffer)
			.values({
				userId,
				dedupeKey: key,
				offer,
				matched: isStrictMatch,
				borderline: isBorderline,
				notified: false
			})
			.onConflictDoUpdate({
				target: [flaschenSeenOffer.userId, flaschenSeenOffer.dedupeKey],
				set: {
					lastSeenAt: new Date(),
					offer,
					matched: isStrictMatch,
					borderline: isBorderline
				}
			})
			.returning({
				id: flaschenSeenOffer.id,
				notified: flaschenSeenOffer.notified,
				inserted: sql<boolean>`(xmax = 0)`
			});

		const row = result[0];
		const wasNew = row?.inserted === true;
		if (wasNew) newOffers++;
		if (isStrictMatch && wasNew && !row.notified) {
			newMatches++;
			matchedOffers.push(offer);
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
