import { db, accounts, expenses, income, debts } from '@nexo/db';
import { eq, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import type { UpcomingEvent } from '$lib/types';
import { resolveMonthlyDate, toDateStr } from '$lib/dateUtils';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const [accountList, expenseList, incomeList, debtList] = await Promise.all([
		db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.createdAt)),
		db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(asc(expenses.createdAt)),
		db.select().from(income).where(eq(income.userId, userId)).orderBy(asc(income.createdAt)),
		db.select().from(debts).where(eq(debts.userId, userId)).orderBy(asc(debts.createdAt))
	]);

	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const nowMs = now.getTime();

	// First day and last day of the current calendar month
	const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day
	const daysInMonth = monthEnd.getDate();

	// Sum all expense/income occurrences that fire within this calendar month
	function firesInMonth(
		recurrence: string,
		dayOfMonth: string | null,
		dueDate: string | null,
		startingMonth: string | null
	): number {
		if (!recurrence || recurrence === 'once') return 0;

		let count = 0;
		for (let day = 1; day <= daysInMonth; day++) {
			const d = new Date(now.getFullYear(), now.getMonth(), day);
			const dayStr = toDateStr(d);

			switch (recurrence) {
				case 'monthly': {
					if (!dayOfMonth) break;
					const resolved = resolveMonthlyDate(d.getFullYear(), d.getMonth(), dayOfMonth);
					if (toDateStr(resolved) === dayStr) count++;
					break;
				}
				case 'weekly':
					if ((d.getTime() - nowMs) % (7 * 86400000) === 0) count++;
					break;
				case 'biweekly':
					if ((d.getTime() - nowMs) % (14 * 86400000) === 0) count++;
					break;
				case 'quarterly':
				case 'half-yearly':
				case 'yearly': {
					if (!dayOfMonth) break;
					const interval = recurrence === 'quarterly' ? 3 : recurrence === 'half-yearly' ? 6 : 12;
					// Use startingMonth to anchor the cycle if provided, otherwise anchor to today's month
					const anchorMonth = startingMonth ? parseInt(startingMonth, 10) - 1 : now.getMonth();
					const monthDiff = (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - anchorMonth;
					if (monthDiff % interval !== 0) break;
					const resolved = resolveMonthlyDate(d.getFullYear(), d.getMonth(), dayOfMonth);
					if (toDateStr(resolved) === dayStr) count++;
					break;
				}
			}
		}
		return count;
	}

	const monthlyExpenses = expenseList
		.filter((e) => e.active && e.recurrence !== 'once')
		.reduce((s, e) => {
			const hits = firesInMonth(e.recurrence, e.dayOfMonth, e.dueDate, e.startingMonth);
			return s + Number(e.amount) * hits;
		}, 0);

	const monthlyIncome = incomeList
		.filter((i) => i.recurrence !== 'once')
		.reduce((s, i) => {
			const hits = firesInMonth(i.recurrence, i.dayOfMonth, i.expectedDate, i.startingMonth);
			return s + Number(i.amount) * hits;
		}, 0);

	const in30 = new Date(now);
	in30.setDate(in30.getDate() + 30);

	function nextRecurringDate(
		recurrence: string,
		dayOfMonth: string | null,
		nowMs: number
	): Date | null {
		if (!dayOfMonth) return null;
		const today = new Date(nowMs);
		// Check this month and next month for the firing date
		for (let monthOffset = 0; monthOffset <= 1; monthOffset++) {
			const year = today.getFullYear() + Math.floor((today.getMonth() + monthOffset) / 12);
			const month = (today.getMonth() + monthOffset) % 12;
			let candidate: Date | null = null;
			if (recurrence === 'monthly') {
				candidate = resolveMonthlyDate(year, month, dayOfMonth);
			} else if (
				recurrence === 'quarterly' ||
				recurrence === 'half-yearly' ||
				recurrence === 'yearly'
			) {
				const interval = recurrence === 'quarterly' ? 3 : recurrence === 'half-yearly' ? 6 : 12;
				const monthsSinceToday = (year - today.getFullYear()) * 12 + month - today.getMonth();
				if (monthsSinceToday % interval === 0) {
					candidate = resolveMonthlyDate(year, month, dayOfMonth);
				}
			} else if (recurrence === 'weekly') {
				// next occurrence is today or in 1-7 days
				for (let d = 0; d < 7; d++) {
					const c = new Date(nowMs + d * 86400000);
					if (d === 0 || (c.getTime() - nowMs) % (7 * 86400000) === 0) {
						candidate = c;
						break;
					}
				}
			} else if (recurrence === 'biweekly') {
				for (let d = 0; d < 14; d++) {
					const c = new Date(nowMs + d * 86400000);
					if (d === 0 || (c.getTime() - nowMs) % (14 * 86400000) === 0) {
						candidate = c;
						break;
					}
				}
			}
			if (candidate) {
				candidate.setHours(0, 0, 0, 0);
				if (candidate >= today && candidate <= in30) return candidate;
			}
		}
		return null;
	}

	const recurringUpcoming: UpcomingEvent[] = expenseList
		.filter((e) => e.active && e.recurrence !== 'once')
		.flatMap((e) => {
			const next = nextRecurringDate(e.recurrence, e.dayOfMonth, now.getTime());
			if (!next) return [];
			return [
				{
					id: e.id,
					label: e.name,
					amount: Number(e.amount),
					date: toDateStr(next),
					type: 'expense' as const
				}
			];
		});

	const upcoming: UpcomingEvent[] = [
		...expenseList
			.filter((e) => e.dueDate && new Date(e.dueDate) >= now && new Date(e.dueDate) <= in30)
			.map((e) => ({
				id: e.id,
				label: e.name,
				amount: Number(e.amount),
				date: e.dueDate!,
				type: 'expense' as const
			})),
		...recurringUpcoming,
		...incomeList
			.filter(
				(i) => i.expectedDate && new Date(i.expectedDate) >= now && new Date(i.expectedDate) <= in30
			)
			.map((i) => ({
				id: i.id,
				label: i.name,
				amount: Number(i.amount),
				date: i.expectedDate!,
				type: 'income' as const
			})),
		...debtList
			.filter(
				(d) => !d.paid && d.dueDate && new Date(d.dueDate) >= now && new Date(d.dueDate) <= in30
			)
			.map((d) => ({
				id: d.id,
				label: d.counterparty,
				amount: Number(d.amount),
				date: d.dueDate!,
				type: 'debt' as const
			}))
	].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

	return {
		accounts: accountList.map((a) => ({ ...a, balance: Number(a.balance) })),
		expenses: expenseList,
		incomeItems: incomeList,
		monthlyExpenses,
		monthlyIncome,
		upcoming
	};
};
