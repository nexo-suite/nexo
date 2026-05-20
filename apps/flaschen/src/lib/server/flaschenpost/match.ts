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

type WindowFailReason =
	| 'disabled'
	| 'marketplace_excluded'
	| 'warehouse_excluded'
	| 'workgroup_excluded'
	| 'day_unavailable'
	| 'override_excludes'
	| 'outside_window';

type WindowFailDetail = {
	reason: WindowFailReason;
	overrideDate?: string;
};

export function windowFailDetail(
	prefs: FlaschenPrefs,
	overrides: FlaschenDateOverride[],
	offer: ShiftOfferPayload
): WindowFailDetail | null {
	if (!prefs.enabled) return { reason: 'disabled' };
	if (!prefs.includeMarketplace && offer.isMarketplaceShift)
		return { reason: 'marketplace_excluded' };
	if (!prefs.warehouseIds.includes(offer.warehouse.warehouseId))
		return { reason: 'warehouse_excluded' };
	if (!prefs.workgroupIds.includes(offer.workgroup.workgroupId))
		return { reason: 'workgroup_excluded' };

	const local = parseOfferStart(offer.start);
	const dateKey = berlinDateKey(local);
	const override = overrides.find((o) => o.date === dateKey);

	if (override?.kind === 'unavailable') return { reason: 'day_unavailable', overrideDate: dateKey };

	let slots: WeeklySlot[];
	const usingOverride = override?.kind === 'available';
	if (usingOverride) slots = override.slots;
	else {
		const dow = String(local.dayOfWeek) as keyof WeeklyWindows;
		slots = (prefs.weeklyWindows as WeeklyWindows)[dow] ?? [];
	}

	const minutes = local.hour * 60 + local.minute;
	const inSlots = slots.some((s) => minutes >= s.start && minutes < s.end);
	if (slots.length === 0 || !inSlots) {
		return usingOverride
			? { reason: 'override_excludes', overrideDate: dateKey }
			: { reason: 'outside_window' };
	}

	return null;
}

export function matchesWindow(
	prefs: FlaschenPrefs,
	overrides: FlaschenDateOverride[],
	offer: ShiftOfferPayload
): boolean {
	return windowFailDetail(prefs, overrides, offer) === null;
}

export function withinLengthRange(prefs: FlaschenPrefs, offer: ShiftOfferPayload): boolean {
	if (offer.durationInMinutes < prefs.shiftMinMinutes) return false;
	if (offer.durationInMinutes > prefs.shiftMaxMinutes) return false;
	return true;
}

export function meetsAdvanceNotice(
	prefs: FlaschenPrefs,
	offer: ShiftOfferPayload,
	now: Date = new Date()
): boolean {
	if (prefs.advanceNoticeMinutes <= 0) return true;
	const start = new Date(offer.start).getTime();
	const minStart = now.getTime() + prefs.advanceNoticeMinutes * 60_000;
	return start >= minStart;
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
