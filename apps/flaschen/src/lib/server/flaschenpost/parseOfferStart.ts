import { Temporal } from '@js-temporal/polyfill';
import { flaschenpostEnv } from './env';

type TzMode = 'utc' | 'local-naive';

function mode(): TzMode {
	const raw = flaschenpostEnv().FLASCHEN_API_TZ_MODE;
	return raw === 'utc' ? 'utc' : 'local-naive';
}

/**
 * Parse a timestamp from the Flaschenpost API into a Europe/Berlin
 * ZonedDateTime. The API emits values like "2026-05-22T18:00:00+00:00";
 * the offset is unreliable on German B2E APIs which often label naive
 * local wall-clock time with "+00:00". The default `local-naive` mode
 * strips the offset and treats the wall-clock as Berlin local time;
 * setting FLASCHEN_API_TZ_MODE=utc trusts the offset.
 */
export function parseOfferStart(isoString: string, tz = 'Europe/Berlin'): Temporal.ZonedDateTime {
	if (mode() === 'utc') {
		return Temporal.Instant.from(isoString).toZonedDateTimeISO(tz);
	}
	const naive = isoString.replace(/(Z|[+-]\d{2}:?\d{2})$/, '');
	return Temporal.PlainDateTime.from(naive).toZonedDateTime(tz);
}

/** Returns Berlin-aligned [from, to] ISO strings covering today through
 *  today + days days. The Flaschenpost API rejects values whose time-of-day
 *  is anything other than `T00:00:00` (returns 500), so we format as the
 *  Berlin local *date* with a literal `T00:00:00Z` suffix — the API treats
 *  the offset as wall-clock and only validates the time component. */
export function rangeForDays(
	days: number,
	now: Date = new Date(),
	tz = 'Europe/Berlin'
): { from: string; to: string } {
	const today = Temporal.Instant.fromEpochMilliseconds(now.getTime())
		.toZonedDateTimeISO(tz)
		.toPlainDate();
	const end = today.add({ days });
	return {
		from: `${today.toString()}T00:00:00Z`,
		to: `${end.toString()}T00:00:00Z`
	};
}
