import { db, debts, accounts } from '@nexo/db';
import { eq, asc, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import { assertAccountOwned, InvalidAccountError } from '$lib/server/auth-helpers';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const [rows, accountList] = await Promise.all([
		db.select().from(debts).where(eq(debts.userId, userId)).orderBy(asc(debts.createdAt)),
		db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.createdAt))
	]);
	return {
		debts: rows.map((d) => ({ ...d, amount: Number(d.amount) })),
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
			direction: d.get('direction') as string,
			counterparty: d.get('counterparty') as string,
			amount: String(parseFloat(d.get('amount') as string) || 0),
			dueDate: (d.get('due_date') as string) || null,
			accountId: (d.get('account_id') as string) || null,
			paid: d.get('paid') === 'true',
			notes: (d.get('notes') as string) || null
		};
		if (!payload.counterparty) return fail(400, { error: 'VALIDATION_REQUIRED' });
		try {
			await assertAccountOwned(payload.accountId, userId);
			if (id) {
				await db
					.update(debts)
					.set(payload)
					.where(and(eq(debts.id, id), eq(debts.userId, userId)));
			} else {
				await db.insert(debts).values({ ...payload, userId });
			}
		} catch (e) {
			if (e instanceof InvalidAccountError) {
				return fail(400, { error: 'INVALID_ACCOUNT', correlationId: locals.correlationId });
			}
			logger.error('db error', {
				action: 'save-debt',
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'Database error', correlationId: locals.correlationId });
		}
		return { success: true, toast: payload.paid ? 'Debt settled' : 'Debt saved' };
	},
	remove: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const d = await request.formData();
		const id = d.get('id') as string;
		try {
			await db.delete(debts).where(and(eq(debts.id, id), eq(debts.userId, userId)));
		} catch (e) {
			logger.error('db error', {
				action: 'remove-debt',
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'Database error', correlationId: locals.correlationId });
		}
		return { success: true, toast: 'Debt deleted' };
	},
	clearSettled: async ({ locals }) => {
		const userId = locals.user!.id;
		try {
			await db.delete(debts).where(and(eq(debts.userId, userId), eq(debts.paid, true)));
		} catch (e) {
			logger.error('db error', {
				action: 'clear-settled-debts',
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'Database error', correlationId: locals.correlationId });
		}
		return { success: true, toast: 'Settled debts cleared' };
	}
};
