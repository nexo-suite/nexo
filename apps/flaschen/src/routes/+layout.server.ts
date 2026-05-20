import type { LayoutServerLoad } from './$types';
import { db, flaschenAccount, loadHubProfile } from '@nexo/db';
import { eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	const userId = locals.user?.id ?? null;

	let connection: 'connected' | 'never' | 'reconnect' = 'never';
	if (userId) {
		const [account] = await db
			.select({ needsReconnect: flaschenAccount.needsReconnect })
			.from(flaschenAccount)
			.where(eq(flaschenAccount.userId, userId))
			.limit(1);
		if (!account) connection = 'never';
		else if (account.needsReconnect) connection = 'reconnect';
		else connection = 'connected';
	}

	const profile = userId ? await loadHubProfile(userId) : null;

	return {
		user: locals.user,
		profile,
		correlationId: locals.correlationId,
		connection
	};
};
