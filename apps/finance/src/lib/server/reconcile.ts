import { db, accounts, expenses, income, debts, userSettings, transactions } from '@nexo/db';
import { eq, and, isNotNull, sql } from 'drizzle-orm';
import { firesOnDate } from './recurrence';
import { toDateStr } from '$lib/dateUtils';
import { logger } from './logger';

export async function reconcileUser(userId: string): Promise<number> {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayStr = toDateStr(today);

	const [settings] = await db
		.select({ lastReconciledAt: userSettings.lastReconciledAt })
		.from(userSettings)
		.where(eq(userSettings.userId, userId))
		.limit(1);

	const lastStr = settings?.lastReconciledAt ?? null;
	if (lastStr === todayStr) return 0;

	const startDate = new Date(lastStr ?? todayStr);
	startDate.setHours(0, 0, 0, 0);
	if (!lastStr) {
		startDate.setDate(startDate.getDate() - 1);
	}

	const [expenseList, incomeList, debtList] = await Promise.all([
		db
			.select()
			.from(expenses)
			.where(
				and(eq(expenses.userId, userId), eq(expenses.active, true), isNotNull(expenses.accountId))
			),
		db
			.select()
			.from(income)
			.where(and(eq(income.userId, userId), isNotNull(income.accountId))),
		db
			.select()
			.from(debts)
			.where(and(eq(debts.userId, userId), eq(debts.paid, false), isNotNull(debts.accountId)))
	]);

	let count = 0;

	for (
		let d = new Date(startDate.getTime() + 86400000);
		d <= today;
		d = new Date(d.getTime() + 86400000)
	) {
		const dateStr = toDateStr(d);

		for (const e of expenseList) {
			if (!e.accountId) continue;
			if (firesOnDate(e.recurrence, e.dayOfMonth, e.dueDate, e.startingMonth, d, today)) {
				const exists = await db
					.select({ id: transactions.id })
					.from(transactions)
					.where(and(eq(transactions.expenseId, e.id), eq(transactions.firedDate, dateStr)))
					.limit(1);
				if (exists.length > 0) continue;

				await db.insert(transactions).values({
					userId,
					accountId: e.accountId,
					expenseId: e.id,
					type: 'expense',
					amount: e.amount,
					firedDate: dateStr,
					description: e.name
				});
				await db
					.update(accounts)
					.set({ balance: sql`${accounts.balance} - ${e.amount}` })
					.where(and(eq(accounts.id, e.accountId), eq(accounts.userId, userId)));
				count++;
			}
		}

		for (const inc of incomeList) {
			if (!inc.accountId) continue;
			if (inc.received && inc.recurrence === 'once') continue;
			if (
				firesOnDate(inc.recurrence, inc.dayOfMonth, inc.expectedDate, inc.startingMonth, d, today)
			) {
				const exists = await db
					.select({ id: transactions.id })
					.from(transactions)
					.where(and(eq(transactions.incomeId, inc.id), eq(transactions.firedDate, dateStr)))
					.limit(1);
				if (exists.length > 0) continue;

				await db.insert(transactions).values({
					userId,
					accountId: inc.accountId,
					incomeId: inc.id,
					type: 'income',
					amount: inc.amount,
					firedDate: dateStr,
					description: inc.name
				});
				await db
					.update(accounts)
					.set({ balance: sql`${accounts.balance} + ${inc.amount}` })
					.where(and(eq(accounts.id, inc.accountId), eq(accounts.userId, userId)));
				count++;
			}
		}

		for (const debt of debtList) {
			if (!debt.accountId || !debt.dueDate) continue;
			if (debt.dueDate === dateStr) {
				const exists = await db
					.select({ id: transactions.id })
					.from(transactions)
					.where(and(eq(transactions.debtId, debt.id), eq(transactions.firedDate, dateStr)))
					.limit(1);
				if (exists.length > 0) continue;

				await db.insert(transactions).values({
					userId,
					accountId: debt.accountId,
					debtId: debt.id,
					type: 'debt',
					amount: debt.amount,
					firedDate: dateStr,
					description: debt.counterparty
				});
				await db
					.update(accounts)
					.set({
						balance:
							debt.direction === 'owe'
								? sql`${accounts.balance} - ${debt.amount}`
								: sql`${accounts.balance} + ${debt.amount}`
					})
					.where(and(eq(accounts.id, debt.accountId), eq(accounts.userId, userId)));
				count++;
			}
		}
	}

	await db
		.insert(userSettings)
		.values({ userId, lastReconciledAt: todayStr })
		.onConflictDoUpdate({
			target: userSettings.userId,
			set: { lastReconciledAt: todayStr }
		});

	if (count > 0) {
		logger.info('reconciliation complete', { userId, transactions: count });
	}

	return count;
}
