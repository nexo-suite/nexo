import { withUser, accounts, expenses, income, debts } from '@nexo/db';
import { eq, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const { accountList, expenseList, incomeList, debtList } = await withUser(userId, async (tx) => {
		const [accountList, expenseList, incomeList, debtList] = await Promise.all([
			tx
				.select()
				.from(accounts)
				.where(eq(accounts.userId, userId))
				.orderBy(asc(accounts.createdAt)),
			tx
				.select()
				.from(expenses)
				.where(eq(expenses.userId, userId))
				.orderBy(asc(expenses.createdAt)),
			tx.select().from(income).where(eq(income.userId, userId)).orderBy(asc(income.createdAt)),
			tx.select().from(debts).where(eq(debts.userId, userId)).orderBy(asc(debts.createdAt))
		]);
		return { accountList, expenseList, incomeList, debtList };
	});
	return {
		accounts: accountList.map((a) => ({ ...a, balance: Number(a.balance) })),
		expenses: expenseList,
		incomeItems: incomeList,
		debts: debtList
	};
};
