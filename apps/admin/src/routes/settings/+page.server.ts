import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { db, pushSubscription } from '@nexo/db';
import { and, desc, eq } from 'drizzle-orm';
import { env as publicEnv } from '$env/dynamic/public';
import { logger } from '$lib/server/logger';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const devices = await db
		.select()
		.from(pushSubscription)
		.where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.app, 'admin')))
		.orderBy(desc(pushSubscription.createdAt));

	return {
		devices,
		vapidPublicKey: publicEnv.PUBLIC_VAPID_PUBLIC_KEY ?? ''
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
		if (!id) return fail(400, { error: 'MISSING_ID' as const });

		try {
			await db
				.update(pushSubscription)
				.set({ label: label || null })
				.where(and(eq(pushSubscription.id, id), eq(pushSubscription.userId, userId)));
		} catch (e) {
			logger.error('rename device failed', { userId, error: String(e) });
			return fail(500, { error: 'DB_ERROR' as const, correlationId: locals.correlationId });
		}
		return { success: true as const };
	},

	remove: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '');
		if (!id) return fail(400, { error: 'MISSING_ID' as const });

		try {
			await db
				.delete(pushSubscription)
				.where(and(eq(pushSubscription.id, id), eq(pushSubscription.userId, userId)));
		} catch (e) {
			logger.error('remove device failed', { userId, error: String(e) });
			return fail(500, { error: 'DB_ERROR' as const, correlationId: locals.correlationId });
		}
		return { success: true as const };
	}
};
