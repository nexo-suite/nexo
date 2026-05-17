import { db, accounts, expenses, income, debts } from '@nexo/db';
import { eq, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import type { UpcomingEvent } from '$lib/types';
import { toDateStr } from '$lib/dateUtils';
import { firesOnDate } from '$lib/server/recurrence';

export const load: PageServerLoad = async ({ locals, parent }) => {
	const userId = locals.user!.id;
	const { settings } = await parent();

	const [accountList, expenseList, incomeList, debtList] = await Promise.all([
		db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.createdAt)),
		db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(asc(expenses.createdAt)),
		db.select().from(income).where(eq(income.userId, userId)).orderBy(asc(income.createdAt)),
		db.select().from(debts).where(eq(debts.userId, userId)).orderBy(asc(debts.createdAt))
	]);

	const now = new Date();
	now.setHours(0, 0, 0, 0);

	const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	const daysInMonth = monthEnd.getDate();

	// Monthly totals for this month
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
			if (firesOnDate(recurrence, dayOfMonth, dueDate, startingMonth, d, now)) count++;
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

	// 365-day forecast trajectory (client slices to 30D/90D/1Y)
	const forecastDays = 365;
	const liquidBalance = accountList
		.filter((a) => a.includeInTotal)
		.reduce((s, a) => s + Number(a.balance), 0);

	const trajectory: number[] = [liquidBalance];
	let bal = liquidBalance;

	for (let i = 1; i < forecastDays; i++) {
		const d = new Date(now);
		d.setDate(d.getDate() + i);

		for (const e of expenseList) {
			if (!e.active) continue;
			if (firesOnDate(e.recurrence, e.dayOfMonth, e.dueDate, e.startingMonth, d, now)) {
				bal -= Number(e.amount);
			}
		}

		for (const inc of incomeList) {
			if (inc.received && inc.recurrence === 'once') continue;
			if (
				firesOnDate(inc.recurrence, inc.dayOfMonth, inc.expectedDate, inc.startingMonth, d, now)
			) {
				bal += Number(inc.amount);
			}
		}

		if (settings.includeDebtInForecast) {
			for (const debt of debtList) {
				if (debt.paid) continue;
				if (debt.dueDate && toDateStr(d) === debt.dueDate) {
					if (debt.direction === 'owe') bal -= Number(debt.amount);
					else bal += Number(debt.amount);
				}
			}
		}

		trajectory.push(bal);
	}

	const endDate = new Date(now);
	endDate.setDate(endDate.getDate() + forecastDays - 1);

	const lowestValue = Math.min(...trajectory);
	const lowestDay = trajectory.indexOf(lowestValue);
	const lowestDate = new Date(now);
	lowestDate.setDate(lowestDate.getDate() + lowestDay);

	// Upcoming events (30 days)
	const in30 = new Date(now);
	in30.setDate(in30.getDate() + 30);

	const upcoming: UpcomingEvent[] = [];

	for (const e of expenseList) {
		if (!e.active) continue;
		if (e.recurrence === 'once' && e.dueDate) {
			const dd = new Date(e.dueDate);
			if (dd >= now && dd <= in30) {
				upcoming.push({
					id: e.id,
					label: e.name,
					amount: Number(e.amount),
					date: e.dueDate,
					type: 'expense'
				});
			}
		} else {
			for (let i = 0; i < 30; i++) {
				const d = new Date(now);
				d.setDate(d.getDate() + i);
				if (firesOnDate(e.recurrence, e.dayOfMonth, e.dueDate, e.startingMonth, d, now)) {
					upcoming.push({
						id: e.id,
						label: e.name,
						amount: Number(e.amount),
						date: toDateStr(d),
						type: 'expense'
					});
					break;
				}
			}
		}
	}

	for (const inc of incomeList) {
		if (inc.received && inc.recurrence === 'once') continue;
		if (inc.recurrence === 'once' && inc.expectedDate) {
			const dd = new Date(inc.expectedDate);
			if (dd >= now && dd <= in30) {
				upcoming.push({
					id: inc.id,
					label: inc.name,
					amount: Number(inc.amount),
					date: inc.expectedDate,
					type: 'income'
				});
			}
		} else {
			for (let i = 0; i < 30; i++) {
				const d = new Date(now);
				d.setDate(d.getDate() + i);
				if (
					firesOnDate(inc.recurrence, inc.dayOfMonth, inc.expectedDate, inc.startingMonth, d, now)
				) {
					upcoming.push({
						id: inc.id,
						label: inc.name,
						amount: Number(inc.amount),
						date: toDateStr(d),
						type: 'income'
					});
					break;
				}
			}
		}
	}

	for (const d of debtList) {
		if (d.paid) continue;
		if (d.dueDate) {
			const dd = new Date(d.dueDate);
			if (dd >= now && dd <= in30) {
				upcoming.push({
					id: d.id,
					label: d.counterparty,
					amount: Number(d.amount),
					date: d.dueDate,
					type: 'debt'
				});
			}
		}
	}

	upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

	// Today's events for spotlight
	const todayStr = toDateStr(now);
	const todayEvents = upcoming.filter((e) => e.date === todayStr);

	return {
		accounts: accountList.map((a) => ({ ...a, balance: Number(a.balance) })),
		expenses: expenseList.map((e) => ({ ...e, amount: Number(e.amount) })),
		incomeItems: incomeList.map((i) => ({ ...i, amount: Number(i.amount) })),
		debts: debtList.map((d) => ({ ...d, amount: Number(d.amount) })),
		monthlyExpenses,
		monthlyIncome,
		upcoming,
		todayEvents,
		forecast: {
			trajectory,
			liquidBalance,
			endValue: trajectory[trajectory.length - 1],
			endDate: toDateStr(endDate),
			lowestValue,
			lowestDate: toDateStr(lowestDate),
			delta: trajectory[trajectory.length - 1] - liquidBalance
		}
	};
};
