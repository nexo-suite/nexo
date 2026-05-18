import { withUser, accounts, userSettings } from '@nexo/db';
import { eq, asc, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const rows = await withUser(userId, (tx) =>
		tx.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.createdAt))
	);
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

		try {
			await withUser(userId, async (tx) => {
				const [settings] = await tx
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
					emoji: (d.get('emoji') as string) || null,
					includeInTotal: d.get('include_in_total') === 'true'
				};
				if (!payload.name) throw new Error('VALIDATION_REQUIRED');
				if (id) {
					await tx
						.update(accounts)
						.set(payload)
						.where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
				} else {
					await tx.insert(accounts).values({ ...payload, userId });
				}
			});
		} catch (e) {
			if (e instanceof Error && e.message === 'VALIDATION_REQUIRED') {
				return fail(400, { error: 'VALIDATION_REQUIRED' });
			}
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
			await withUser(userId, (tx) =>
				tx.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
			);
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
