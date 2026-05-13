import { db, expenses } from '@nexo/db';
import { eq, asc, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const rows = await db
		.select()
		.from(expenses)
		.where(eq(expenses.userId, userId))
		.orderBy(asc(expenses.createdAt));
	return { expenses: rows.map((e) => ({ ...e, amount: Number(e.amount) })), userId };
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
			active: d.get('active') === 'true'
		};
		if (!payload.name) return fail(400, { error: 'Name is required' });
		try {
			if (id) {
				await db.update(expenses).set(payload).where(eq(expenses.id, id));
			} else {
				await db.insert(expenses).values({ ...payload, userId });
			}
		} catch (e) {
			logger.error('db error', {
				action: 'save-expense',
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
			await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
		} catch (e) {
			logger.error('db error', {
				action: 'remove-expense',
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'Database error', correlationId: locals.correlationId });
		}
		return { success: true };
	}
};
