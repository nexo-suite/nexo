import { db, income } from '@nexo/db';
import { eq, asc, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const rows = await db
		.select()
		.from(income)
		.where(eq(income.userId, userId))
		.orderBy(asc(income.createdAt));
	return { incomeItems: rows.map((i) => ({ ...i, amount: Number(i.amount) })), userId };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const d = await request.formData();
		const id = d.get('id') as string | null;
		const payload = {
			name: d.get('name') as string,
			amount: String(parseFloat(d.get('amount') as string) || 0),
			recurrence: d.get('recurrence') as string,
			dayOfMonth: (d.get('day_of_month') as string) || null,
			expectedDate: (d.get('expected_date') as string) || null,
			startingMonth: (d.get('starting_month') as string) || null,
			received: d.get('received') === 'true'
		};
		if (!payload.name) return fail(400, { error: 'Name is required' });
		if (id) {
			await db.update(income).set(payload).where(eq(income.id, id));
		} else {
			await db.insert(income).values({ ...payload, userId });
		}
		return { success: true };
	},
	remove: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const d = await request.formData();
		const id = d.get('id') as string;
		await db.delete(income).where(and(eq(income.id, id), eq(income.userId, userId)));
		return { success: true };
	}
};
