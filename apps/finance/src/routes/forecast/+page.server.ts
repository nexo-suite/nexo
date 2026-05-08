import { db, accounts, expenses, income, debts } from '@nexo/db';
import { eq, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const [accountList, expenseList, incomeList, debtList] = await Promise.all([
		db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.createdAt)),
		db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(asc(expenses.createdAt)),
		db.select().from(income).where(eq(income.userId, userId)).orderBy(asc(income.createdAt)),
		db.select().from(debts).where(eq(debts.userId, userId)).orderBy(asc(debts.createdAt))
	]);
	return {
		accounts: accountList.map((a) => ({ ...a, balance: Number(a.balance) })),
		expenses: expenseList,
		incomeItems: incomeList,
		debts: debtList
	};
};
