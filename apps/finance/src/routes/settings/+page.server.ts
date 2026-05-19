import { fail } from '@sveltejs/kit';
import { withUser, userSettings, accounts, loadHubProfile } from '@nexo/db';
import { eq, and, asc } from 'drizzle-orm';
import { logger } from '$lib/server/logger';
import { assertAccountOwned, InvalidAccountError } from '$lib/server/auth-helpers';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const [{ row, accountList }, profile] = await Promise.all([
		withUser(userId, async (tx) => {
			const [row] = await tx
				.select()
				.from(userSettings)
				.where(eq(userSettings.userId, userId))
				.limit(1);

			const accountList = await tx
				.select()
				.from(accounts)
				.where(eq(accounts.userId, userId))
				.orderBy(asc(accounts.createdAt));

			return { row, accountList };
		}),
		loadHubProfile(userId)
	]);

	return {
		profile,
		currency: row?.currency ?? 'EUR',
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
		const userId = locals.user!.id;
		const form = await request.formData();
		const currency = (form.get('currency') as string) || 'EUR';
		const defaultAccountId = (form.get('defaultAccountId') as string) || null;
		const hideCents = form.get('hideCents') === 'true';
		const forecastDays = (form.get('forecastDays') as string) || '90';
		const includeDebtInForecast = form.get('includeDebtInForecast') !== 'false';

		try {
			await withUser(userId, async (tx) => {
				await assertAccountOwned(tx, defaultAccountId, userId);
				await tx
					.insert(userSettings)
					.values({
						userId,
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
			});
		} catch (e) {
			if (e instanceof InvalidAccountError) {
				return fail(400, { error: 'INVALID_ACCOUNT', correlationId: locals.correlationId });
			}
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
		const userId = locals.user!.id;
		const form = await request.formData();
		const accountId = form.get('accountId') as string;
		const include = form.get('include') === 'true';

		try {
			await withUser(userId, (tx) =>
				tx
					.update(accounts)
					.set({ includeInTotal: include, updatedAt: new Date() })
					.where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
			);
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
