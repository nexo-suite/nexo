import { redirect } from '@sveltejs/kit';
import { getAuth } from '$lib/server/auth';
import { db, userAppAccess } from '@nexo/db';
import { eq } from 'drizzle-orm';
import { env as publicEnv } from '$env/dynamic/public';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		const authURL = publicEnv.PUBLIC_AUTH_URL;
		const landingURL = publicEnv.PUBLIC_LANDING_URL ?? 'https://krieger2501.de';
		redirect(303, `${authURL}/login?redirectTo=${encodeURIComponent(`${landingURL}/apps`)}`);
	}

	const access = await db
		.select()
		.from(userAppAccess)
		.where(eq(userAppAccess.userId, locals.user.id));

	const allowedApps = access.map((a) => a.app);

	return {
		user: { name: locals.user.name, email: locals.user.email, image: locals.user.image },
		allowedApps
	};
};
