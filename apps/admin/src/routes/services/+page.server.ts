import { db, users, accounts, expenses, income, debts } from '@nexo/db';
import { count, gte, and } from 'drizzle-orm';
import { dockerGet } from '$lib/server/docker';
import type { ContainerInfo } from '$lib/server/docker';
import type { PageServerLoad } from './$types';

function startOf(unit: 'day' | 'week' | 'month'): Date {
	const now = new Date();
	if (unit === 'day') {
		return new Date(now.getFullYear(), now.getMonth(), now.getDate());
	}
	if (unit === 'week') {
		const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
		return d;
	}
	return new Date(now.getFullYear(), now.getMonth(), 1);
}

export const load: PageServerLoad = async () => {
	const today = startOf('day');
	const weekStart = startOf('week');
	const monthStart = startOf('month');

	const [
		containers,
		totalUsers,
		totalAccounts,
		totalExpenses,
		totalIncome,
		totalDebts,
		usersToday,
		usersWeek,
		usersMonth,
		expensesToday,
		expensesWeek,
		expensesMonth,
		incomeToday,
		incomeWeek,
		incomeMonth
	] = await Promise.all([
		dockerGet<ContainerInfo[]>(
			`/containers/json?all=1&filters=${encodeURIComponent(JSON.stringify({ network: ['nexo-production', 'nexo-preview'] }))}`
		).catch(() => [] as ContainerInfo[]),
		db.select({ value: count() }).from(users),
		db.select({ value: count() }).from(accounts),
		db.select({ value: count() }).from(expenses),
		db.select({ value: count() }).from(income),
		db.select({ value: count() }).from(debts),
		db.select({ value: count() }).from(users).where(gte(users.createdAt, today)),
		db.select({ value: count() }).from(users).where(gte(users.createdAt, weekStart)),
		db.select({ value: count() }).from(users).where(gte(users.createdAt, monthStart)),
		db
			.select({ value: count() })
			.from(expenses)
			.where(and(gte(expenses.createdAt, today))),
		db
			.select({ value: count() })
			.from(expenses)
			.where(and(gte(expenses.createdAt, weekStart))),
		db
			.select({ value: count() })
			.from(expenses)
			.where(and(gte(expenses.createdAt, monthStart))),
		db
			.select({ value: count() })
			.from(income)
			.where(and(gte(income.createdAt, today))),
		db
			.select({ value: count() })
			.from(income)
			.where(and(gte(income.createdAt, weekStart))),
		db
			.select({ value: count() })
			.from(income)
			.where(and(gte(income.createdAt, monthStart)))
	]);

	return {
		containers,
		dbStats: {
			totals: {
				users: totalUsers[0]?.value ?? 0,
				accounts: totalAccounts[0]?.value ?? 0,
				expenses: totalExpenses[0]?.value ?? 0,
				income: totalIncome[0]?.value ?? 0,
				debts: totalDebts[0]?.value ?? 0
			},
			activity: {
				users: {
					today: usersToday[0]?.value ?? 0,
					week: usersWeek[0]?.value ?? 0,
					month: usersMonth[0]?.value ?? 0
				},
				expenses: {
					today: expensesToday[0]?.value ?? 0,
					week: expensesWeek[0]?.value ?? 0,
					month: expensesMonth[0]?.value ?? 0
				},
				income: {
					today: incomeToday[0]?.value ?? 0,
					week: incomeWeek[0]?.value ?? 0,
					month: incomeMonth[0]?.value ?? 0
				}
			}
		}
	};
};
