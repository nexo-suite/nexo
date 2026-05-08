import { db, accounts, expenses, income, debts } from '@nexo/db';
import { eq, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import type { UpcomingEvent } from '$lib/types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const [accountList, expenseList, incomeList, debtList] = await Promise.all([
		db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.createdAt)),
		db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(asc(expenses.createdAt)),
		db.select().from(income).where(eq(income.userId, userId)).orderBy(asc(income.createdAt)),
		db.select().from(debts).where(eq(debts.userId, userId)).orderBy(asc(debts.createdAt))
	]);

	const MONTHLY_FACTOR: Record<string, number> = {
		weekly: 52 / 12,
		biweekly: 26 / 12,
		monthly: 1,
		quarterly: 1 / 3,
		'half-yearly': 1 / 6,
		yearly: 1 / 12
	};

	const monthlyExpenses = expenseList
		.filter((e) => e.active && e.recurrence !== 'once')
		.reduce((s, e) => s + Number(e.amount) * (MONTHLY_FACTOR[e.recurrence] ?? 0), 0);

	const monthlyIncome = incomeList
		.filter((i) => i.recurrence !== 'once')
		.reduce((s, i) => s + Number(i.amount) * (MONTHLY_FACTOR[i.recurrence] ?? 0), 0);

	const now = new Date();
	const in30 = new Date(now);
	in30.setDate(in30.getDate() + 30);

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
