import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { db, flaschenAccount, loadHubProfile } from '@nexo/db';
import { eq } from 'drizzle-orm';

const appMeta = {
	version: env.APP_VERSION ?? __APP_VERSION_FALLBACK__,
	commit: env.APP_COMMIT ?? env.GIT_COMMIT ?? __APP_COMMIT_FALLBACK__,
	buildTime: env.APP_BUILD_TIME ?? env.BUILD_TIME ?? __APP_BUILD_TIME_FALLBACK__
};

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
		connection,
		appMeta
	};
};
