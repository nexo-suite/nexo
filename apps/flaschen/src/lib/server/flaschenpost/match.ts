import type {
	FlaschenDateOverride,
	FlaschenPrefs,
	ShiftOfferPayload,
	WeeklySlot,
	WeeklyWindows
} from '@nexo/db';
import { parseOfferStart } from './parseOfferStart';

/** Stable identifier for an offer — used to dedupe across polls. Built from
 *  warehouse+workgroup+start+duration; not from the raw object reference. */
export function dedupeKey(o: ShiftOfferPayload): string {
	return `${o.warehouse.warehouseId}|${o.workgroup.workgroupId}|${o.start}|${o.durationInMinutes}`;
}

function berlinDateKey(local: { year: number; month: number; day: number }): string {
	return `${local.year}-${String(local.month).padStart(2, '0')}-${String(local.day).padStart(2, '0')}`;
}

export function matchesWindow(
	prefs: FlaschenPrefs,
	overrides: FlaschenDateOverride[],
	offer: ShiftOfferPayload
): boolean {
	if (!prefs.enabled) return false;
	if (!prefs.includeMarketplace && offer.isMarketplaceShift) return false;
	if (!prefs.warehouseIds.includes(offer.warehouse.warehouseId)) return false;
	if (!prefs.workgroupIds.includes(offer.workgroup.workgroupId)) return false;

	const local = parseOfferStart(offer.start);
	const dateKey = berlinDateKey(local);
	const override = overrides.find((o) => o.date === dateKey);

	let slots: WeeklySlot[];
	if (override?.kind === 'unavailable') return false;
	else if (override?.kind === 'available') slots = override.slots;
	else {
		const dow = String(local.dayOfWeek) as keyof WeeklyWindows;
		slots = (prefs.weeklyWindows as WeeklyWindows)[dow] ?? [];
	}

	if (slots.length === 0) return false;
	const minutes = local.hour * 60 + local.minute;
	return slots.some((s) => minutes >= s.start && minutes < s.end);
}

export function withinMaxLength(prefs: FlaschenPrefs, offer: ShiftOfferPayload): boolean {
	return offer.durationInMinutes <= prefs.shiftMaxMinutes;
}

export function formatOfferBody(offer: ShiftOfferPayload): string {
	const local = parseOfferStart(offer.start);
	const dayMap = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
	const day = dayMap[local.dayOfWeek % 7];
	const dd = String(local.day).padStart(2, '0');
	const mm = String(local.month).padStart(2, '0');
	const hh = String(local.hour).padStart(2, '0');
	const min = String(local.minute).padStart(2, '0');

	const hours = Math.floor(offer.durationInMinutes / 60);
	const mins = offer.durationInMinutes % 60;
	const dur = mins ? `${hours}:${String(mins).padStart(2, '0')}h` : `${hours}h`;

	return `${day} ${dd}.${mm} · ${hh}:${min} · ${dur} · ${offer.warehouse.name}`;
}
