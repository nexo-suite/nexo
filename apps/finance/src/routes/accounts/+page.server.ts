import { db, accounts, userSettings } from '@nexo/db';
import { eq, asc, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const rows = await db
		.select()
		.from(accounts)
		.where(eq(accounts.userId, userId))
		.orderBy(asc(accounts.createdAt));
	return {
		accounts: rows.map((a) => ({ ...a, balance: Number(a.balance) })),
		userId
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const d = await request.formData();
		const id = d.get('id') as string | null;

		const [settings] = await db
			.select({ currency: userSettings.currency })
			.from(userSettings)
			.where(eq(userSettings.userId, userId))
			.limit(1);
		const currency = settings?.currency ?? 'EUR';

		const payload = {
			name: d.get('name') as string,
			type: d.get('type') as string,
			balance: String(parseFloat(d.get('balance') as string) || 0),
			currency,
			color: (d.get('color') as string) || null,
			includeInTotal: d.get('include_in_total') === 'true'
		};
		if (!payload.name) return fail(400, { error: 'Name is required' });
		try {
			if (id) {
				await db.update(accounts).set(payload).where(eq(accounts.id, id));
			} else {
				await db.insert(accounts).values({ ...payload, userId });
			}
		} catch (e) {
			logger.error('db error', {
				action: 'save-account',
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
			await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
		} catch (e) {
			logger.error('db error', {
				action: 'remove-account',
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'Database error', correlationId: locals.correlationId });
		}
		return { success: true };
	}
};
