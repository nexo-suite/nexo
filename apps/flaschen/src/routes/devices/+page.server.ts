import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { db, flaschenAccount, flaschenPrefs, pushSubscription } from '@nexo/db';
import { and, desc, eq } from 'drizzle-orm';
import { env as publicEnv } from '$env/dynamic/public';
import { logger } from '$lib/server/logger';
import { loadPrefs } from '$lib/server/flaschenpost';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const [devices, prefs, accountRow] = await Promise.all([
		db
			.select()
			.from(pushSubscription)
			.where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.app, 'flaschen')))
			.orderBy(desc(pushSubscription.createdAt)),
		loadPrefs(userId),
		db.select().from(flaschenAccount).where(eq(flaschenAccount.userId, userId)).limit(1)
	]);

	const account = accountRow[0] ?? null;

	return {
		devices,
		vapidPublicKey: publicEnv.PUBLIC_VAPID_PUBLIC_KEY ?? '',
		watching: prefs.enabled,
		connection: !account
			? ('never' as const)
			: account.needsReconnect
				? ('reconnect' as const)
				: ('connected' as const)
	};
};

export const actions: Actions = {
	rename: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		const label = String(fd.get('label') ?? '')
			.trim()
			.slice(0, 64);
		if (!id) return fail(400, { error: 'MISSING_ID' });

		try {
			await db
				.update(pushSubscription)
				.set({ label: label || null })
				.where(and(eq(pushSubscription.id, id), eq(pushSubscription.userId, userId)));
		} catch (e) {
			logger.error('rename device failed', { userId, error: String(e) });
			return fail(500, { error: 'DB_ERROR', correlationId: locals.correlationId });
		}
		return { success: true };
	},

	remove: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		if (!id) return fail(400, { error: 'MISSING_ID' });

		try {
			await db
				.delete(pushSubscription)
				.where(and(eq(pushSubscription.id, id), eq(pushSubscription.userId, userId)));
		} catch (e) {
			logger.error('remove device failed', { userId, error: String(e) });
			return fail(500, { error: 'DB_ERROR', correlationId: locals.correlationId });
		}
		return { success: true };
	},

	pause: async ({ locals }) => {
		const userId = locals.user!.id;
		try {
			await db
				.update(flaschenPrefs)
				.set({ enabled: false, updatedAt: new Date() })
				.where(eq(flaschenPrefs.userId, userId));
		} catch (e) {
			logger.error('pause prefs failed', { userId, error: String(e) });
			return fail(500, { error: 'DB_ERROR', correlationId: locals.correlationId });
		}
		return { success: true };
	},

	resume: async ({ locals }) => {
		const userId = locals.user!.id;
		try {
			await db
				.update(flaschenPrefs)
				.set({ enabled: true, updatedAt: new Date() })
				.where(eq(flaschenPrefs.userId, userId));
		} catch (e) {
			logger.error('resume prefs failed', { userId, error: String(e) });
			return fail(500, { error: 'DB_ERROR', correlationId: locals.correlationId });
		}
		return { success: true };
	}
};
