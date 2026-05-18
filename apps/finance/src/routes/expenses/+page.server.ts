import { withUser, expenses, accounts } from '@nexo/db';
import { eq, asc, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import { assertAccountOwned, InvalidAccountError } from '$lib/server/auth-helpers';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const { rows, accountList } = await withUser(userId, async (tx) => {
		const [rows, accountList] = await Promise.all([
			tx
				.select()
				.from(expenses)
				.where(eq(expenses.userId, userId))
				.orderBy(asc(expenses.createdAt)),
			tx.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.createdAt))
		]);
		return { rows, accountList };
	});
	return {
		expenses: rows.map((e) => ({ ...e, amount: Number(e.amount) })),
		accounts: accountList.map((a) => ({ id: a.id, name: a.name, emoji: a.emoji })),
		userId
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const d = await request.formData();
		const id = d.get('id') as string | null;
		const payload = {
			name: d.get('name') as string,
			category: d.get('category') as string,
			amount: String(parseFloat(d.get('amount') as string) || 0),
			recurrence: d.get('recurrence') as string,
			dayOfMonth: (d.get('day_of_month') as string) || null,
			dueDate: (d.get('due_date') as string) || null,
			startingMonth: (d.get('starting_month') as string) || null,
			accountId: (d.get('account_id') as string) || null,
			active: d.get('active') === 'true'
		};
		if (!payload.name) return fail(400, { error: 'VALIDATION_REQUIRED' });
		try {
			await withUser(userId, async (tx) => {
				await assertAccountOwned(tx, payload.accountId, userId);
				if (id) {
					await tx
						.update(expenses)
						.set(payload)
						.where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
				} else {
					await tx.insert(expenses).values({ ...payload, userId });
				}
			});
		} catch (e) {
			if (e instanceof InvalidAccountError) {
				return fail(400, { error: 'INVALID_ACCOUNT', correlationId: locals.correlationId });
			}
			logger.error('db error', {
				action: 'save-expense',
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'DB_ERROR', correlationId: locals.correlationId });
		}
		return { success: true, toast: 'Expense saved' };
	},
	remove: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const d = await request.formData();
		const id = d.get('id') as string;
		try {
			await withUser(userId, (tx) =>
				tx.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
			);
		} catch (e) {
			logger.error('db error', {
				action: 'remove-expense',
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'DB_ERROR', correlationId: locals.correlationId });
		}
		return { success: true, toast: 'Expense deleted' };
	}
};
