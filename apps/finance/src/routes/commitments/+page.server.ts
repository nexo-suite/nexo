import { db, accounts, expenses, debts } from '@nexo/db';
import { eq, and, asc } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const [accountRows, expenseRows, debtRows] = await Promise.all([
		db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.name)),
		db
			.select()
			.from(expenses)
			.where(
				and(eq(expenses.userId, userId), eq(expenses.recurrence, 'once'), eq(expenses.active, true))
			)
			.orderBy(asc(expenses.dueDate)),
		db
			.select()
			.from(debts)
			.where(and(eq(debts.userId, userId), eq(debts.paid, false)))
			.orderBy(asc(debts.dueDate))
	]);

	const earmarks: Record<string, { earmarked: number; available: number }> = {};
	for (const acc of accountRows) {
		const balance = Number(acc.balance);
		const fromExpenses = expenseRows
			.filter((e) => e.accountId === acc.id)
			.reduce((s, e) => s + Number(e.amount), 0);
		const fromDebts = debtRows
			.filter((d) => d.accountId === acc.id && d.direction === 'owe')
			.reduce((s, d) => s + Number(d.amount), 0);
		const earmarked = fromExpenses + fromDebts;
		earmarks[acc.id] = { earmarked, available: balance - earmarked };
	}

	return {
		accounts: accountRows.map((a) => ({ ...a, balance: Number(a.balance) })),
		expenses: expenseRows.map((e) => ({ ...e, amount: Number(e.amount) })),
		debts: debtRows.map((d) => ({ ...d, amount: Number(d.amount) })),
		earmarks
	};
};

export const actions: Actions = {
	saveExpense: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const d = await request.formData();
		const id = d.get('id') as string | null;
		const payload = {
			name: d.get('name') as string,
			category: 'other',
			recurrence: 'once' as const,
			amount: String(parseFloat(d.get('amount') as string) || 0),
			dueDate: (d.get('due_date') as string) || null,
			accountId: (d.get('account_id') as string) || null,
			notes: (d.get('notes') as string) || null,
			active: true
		};
		if (!payload.name) return fail(400, { error: 'VALIDATION_REQUIRED' });
		try {
			if (id) {
				await db
					.update(expenses)
					.set(payload)
					.where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
			} else {
				await db.insert(expenses).values({ ...payload, userId });
			}
		} catch (e) {
			logger.error('db error', {
				action: 'save-commitment-expense',
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'Database error', correlationId: locals.correlationId });
		}
		return { success: true, toast: 'Expense saved' };
	},

	removeExpense: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const d = await request.formData();
		const id = d.get('id') as string;
		try {
			await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
		} catch (e) {
			logger.error('db error', {
				action: 'remove-commitment-expense',
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'Database error', correlationId: locals.correlationId });
		}
		return { success: true, toast: 'Expense deleted' };
	},

	saveDebt: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const d = await request.formData();
		const id = d.get('id') as string | null;
		const payload = {
			direction: d.get('direction') as string,
			counterparty: d.get('counterparty') as string,
			amount: String(parseFloat(d.get('amount') as string) || 0),
			dueDate: (d.get('due_date') as string) || null,
			accountId: (d.get('account_id') as string) || null,
			notes: (d.get('notes') as string) || null,
			paid: false
		};
		if (!payload.counterparty) return fail(400, { error: 'Counterparty is required' });
		try {
			if (id) {
				await db
					.update(debts)
					.set(payload)
					.where(and(eq(debts.id, id), eq(debts.userId, userId)));
			} else {
				await db.insert(debts).values({ ...payload, userId });
			}
		} catch (e) {
			logger.error('db error', {
				action: 'save-commitment-debt',
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'Database error', correlationId: locals.correlationId });
		}
		return { success: true, toast: 'Debt saved' };
	},

	removeDebt: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const d = await request.formData();
		const id = d.get('id') as string;
		try {
			await db.delete(debts).where(and(eq(debts.id, id), eq(debts.userId, userId)));
		} catch (e) {
			logger.error('db error', {
				action: 'remove-commitment-debt',
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'Database error', correlationId: locals.correlationId });
		}
		return { success: true, toast: 'Debt deleted' };
	},

	markDebtPaid: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const d = await request.formData();
		const id = d.get('id') as string;
		try {
			await db
				.update(debts)
				.set({ paid: true })
				.where(and(eq(debts.id, id), eq(debts.userId, userId)));
		} catch (e) {
			logger.error('db error', {
				action: 'mark-debt-paid',
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'Database error', correlationId: locals.correlationId });
		}
		return { success: true, toast: 'Debt settled' };
	}
};
