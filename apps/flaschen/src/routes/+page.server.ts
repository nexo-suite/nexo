import type { PageServerLoad } from './$types';
import { db, flaschenAccount, flaschenSeenOffer, flaschenPrefs, pushSubscription } from '@nexo/db';
import { and, desc, eq, sql } from 'drizzle-orm';
import { env as publicEnv } from '$env/dynamic/public';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const [account, prefs, recent, borderline, devices] = await Promise.all([
		db.select().from(flaschenAccount).where(eq(flaschenAccount.userId, userId)).limit(1),
		db.select().from(flaschenPrefs).where(eq(flaschenPrefs.userId, userId)).limit(1),
		db
			.select()
			.from(flaschenSeenOffer)
			.where(and(eq(flaschenSeenOffer.userId, userId), eq(flaschenSeenOffer.matched, true)))
			.orderBy(desc(flaschenSeenOffer.firstSeenAt))
			.limit(10),
		db
			.select()
			.from(flaschenSeenOffer)
			.where(and(eq(flaschenSeenOffer.userId, userId), eq(flaschenSeenOffer.borderline, true)))
			.orderBy(desc(flaschenSeenOffer.firstSeenAt))
			.limit(10),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(pushSubscription)
			.where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.app, 'flaschen')))
	]);

	return {
		account: account[0] ?? null,
		prefs: prefs[0] ?? null,
		recentMatches: recent,
		borderlineMatches: borderline,
		hasDevice: (devices[0]?.count ?? 0) > 0,
		vapidPublicKey: publicEnv.PUBLIC_VAPID_PUBLIC_KEY ?? ''
	};
};
