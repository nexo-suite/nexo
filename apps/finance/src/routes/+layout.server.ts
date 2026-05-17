import { db, userSettings } from '@nexo/db';
import { eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';
import { reconcileUser } from '$lib/server/reconcile';

export const load: LayoutServerLoad = async ({ locals }) => {
	let settings = null;
	if (locals.user) {
		const [row] = await db
			.select()
			.from(userSettings)
			.where(eq(userSettings.userId, locals.user.id))
			.limit(1);
		settings = row ?? null;

		await reconcileUser(locals.user.id);
	}

	return {
		user: locals.user,
		settings: {
			displayName: settings?.displayName ?? null,
			currency: settings?.currency ?? 'EUR',
			weekStartDay: settings?.weekStartDay ?? 'monday',
			defaultAccountId: settings?.defaultAccountId ?? null,
			hideCents: settings?.hideCents ?? false,
			forecastDays: settings?.forecastDays ?? '90',
			includeDebtInForecast: settings?.includeDebtInForecast ?? true
		}
	};
};
