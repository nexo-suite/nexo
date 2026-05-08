import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) redirect(303, '/');

	return {
		error: url.searchParams.get('error'),
		authUrl: env.PUBLIC_AUTH_URL
	};
};
