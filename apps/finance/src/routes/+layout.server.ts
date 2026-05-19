import { withUser, userSettings, loadHubProfile } from '@nexo/db';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';
import { reconcileUser } from '$lib/server/reconcile';

export const load: LayoutServerLoad = async ({ locals }) => {
	let settings = null;
	let profile = null;
	if (locals.user) {
		const userId = locals.user.id;
		const [row, hub] = await Promise.all([
			withUser(userId, (tx) =>
				tx.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1)
			).then((r) => r[0] ?? null),
			loadHubProfile(userId)
		]);
		settings = row;
		profile = hub;

		await reconcileUser(userId);
	}

	return {
		user: locals.user,
		profile,
		settings: {
			displayName: profile?.displayName ?? null,
			currency: settings?.currency ?? 'EUR',
			weekStartDay: profile?.weekStartDay ?? 'monday',
			defaultAccountId: settings?.defaultAccountId ?? null,
			hideCents: settings?.hideCents ?? false,
			forecastDays: settings?.forecastDays ?? '90',
			includeDebtInForecast: settings?.includeDebtInForecast ?? true
		}
	};
};
