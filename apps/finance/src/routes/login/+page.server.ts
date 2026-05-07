import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) redirect(303, '/');

	return {
		error: url.searchParams.get('error'),
		authUrl: process.env.PUBLIC_AUTH_URL ?? 'https://auth.krieger2501.de'
	};
};
