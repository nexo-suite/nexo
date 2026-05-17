import { resolveMonthlyDate, toDateStr } from '$lib/dateUtils';

export function firesOnDate(
	recurrence: string,
	dayOfMonth: string | null,
	dueDate: string | null,
	startingMonth: string | null,
	date: Date,
	anchorDate: Date
): boolean {
	const dayStr = toDateStr(date);
	const anchorMs = anchorDate.getTime();

	switch (recurrence) {
		case 'once':
			return dueDate === dayStr;
		case 'monthly': {
			if (!dayOfMonth) return false;
			const resolved = resolveMonthlyDate(date.getFullYear(), date.getMonth(), dayOfMonth);
			return toDateStr(resolved) === dayStr;
		}
		case 'weekly':
			return (date.getTime() - anchorMs) % (7 * 86400000) === 0;
		case 'biweekly':
			return (date.getTime() - anchorMs) % (14 * 86400000) === 0;
		case 'quarterly':
		case 'half-yearly':
		case 'yearly': {
			if (!dayOfMonth) return false;
			const interval = recurrence === 'quarterly' ? 3 : recurrence === 'half-yearly' ? 6 : 12;
			const anchorMonth = startingMonth ? parseInt(startingMonth, 10) - 1 : anchorDate.getMonth();
			const monthDiff =
				(date.getFullYear() - anchorDate.getFullYear()) * 12 + date.getMonth() - anchorMonth;
			if (monthDiff % interval !== 0) return false;
			const resolved = resolveMonthlyDate(date.getFullYear(), date.getMonth(), dayOfMonth);
			return toDateStr(resolved) === dayStr;
		}
	}
	return false;
}
