import { getAuth } from '$lib/server/auth';
import { env } from '$env/dynamic/public';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
	const auth = getAuth();
	await auth.api.signOut({ headers: request.headers }).catch(() => null);
	redirect(302, env.PUBLIC_LANDING_URL ?? 'https://krieger2501.de');
};
