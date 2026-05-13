import { db, debts } from '@nexo/db';
import { eq, asc, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const rows = await db
		.select()
		.from(debts)
		.where(eq(debts.userId, userId))
		.orderBy(asc(debts.createdAt));
	return { debts: rows.map((d) => ({ ...d, amount: Number(d.amount) })), userId };
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
			paid: d.get('paid') === 'true',
			notes: (d.get('notes') as string) || null
		};
		if (!payload.counterparty) return fail(400, { error: 'Counterparty is required' });
		try {
			if (id) {
				await db.update(debts).set(payload).where(eq(debts.id, id));
			} else {
				await db.insert(debts).values({ ...payload, userId });
			}
		} catch (e) {
			logger.error('db error', {
				action: 'save-debt',
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'Database error', correlationId: locals.correlationId });
		}
		return { success: true };
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
		return { success: true };
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
		return { success: true };
	}
};
