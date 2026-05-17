import { fail } from '@sveltejs/kit';
import { db, userSettings, accounts } from '@nexo/db';
import { eq, and, asc } from 'drizzle-orm';
import { logger } from '$lib/server/logger';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const [row] = await db
		.select()
		.from(userSettings)
		.where(eq(userSettings.userId, userId))
		.limit(1);

	const accountList = await db
		.select()
		.from(accounts)
		.where(eq(accounts.userId, userId))
		.orderBy(asc(accounts.createdAt));

	return {
		user: { name: locals.user!.name, email: locals.user!.email },
		displayName: row?.displayName ?? '',
		currency: row?.currency ?? 'EUR',
		weekStartDay: row?.weekStartDay ?? 'monday',
		defaultAccountId: row?.defaultAccountId ?? null,
		hideCents: row?.hideCents ?? false,
		forecastDays: row?.forecastDays ?? '90',
		includeDebtInForecast: row?.includeDebtInForecast ?? true,
		accounts: accountList.map((a) => ({
			id: a.id,
			name: a.name,
			emoji: a.emoji,
			type: a.type,
			balance: Number(a.balance),
			includeInTotal: a.includeInTotal
		}))
	};
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const form = await request.formData();
		const currency = (form.get('currency') as string) || 'EUR';
		const defaultAccountId = (form.get('defaultAccountId') as string) || null;
		const hideCents = form.get('hideCents') === 'true';
		const forecastDays = (form.get('forecastDays') as string) || '90';
		const includeDebtInForecast = form.get('includeDebtInForecast') !== 'false';

		try {
			await db
				.insert(userSettings)
				.values({
					userId: locals.user!.id,
					currency,
					defaultAccountId,
					hideCents,
					forecastDays,
					includeDebtInForecast
				})
				.onConflictDoUpdate({
					target: userSettings.userId,
					set: {
						currency,
						defaultAccountId,
						hideCents,
						forecastDays,
						includeDebtInForecast,
						updatedAt: new Date()
					}
				});
		} catch (e) {
			logger.error('db error', {
				action: 'save-settings',
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'SAVE_FAILED', correlationId: locals.correlationId });
		}

		return { success: true, toast: 'Settings saved' };
	},

	toggleLiquid: async ({ locals, request }) => {
		const form = await request.formData();
		const accountId = form.get('accountId') as string;
		const include = form.get('include') === 'true';

		try {
			await db
				.update(accounts)
				.set({ includeInTotal: include, updatedAt: new Date() })
				.where(and(eq(accounts.id, accountId), eq(accounts.userId, locals.user!.id)));
		} catch (e) {
			logger.error('db error', {
				action: 'toggle-liquid',
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'TOGGLE_FAILED', correlationId: locals.correlationId });
		}

		return { success: true };
	}
};
