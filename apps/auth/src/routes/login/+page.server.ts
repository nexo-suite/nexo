import { getAuth } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request, url }) => {
	const session = await getAuth()
		.api.getSession({ headers: request.headers })
		.catch(() => null);
	if (!session?.user) return { user: null };

	const redirectTo = url.searchParams.get('redirectTo');
	if (!redirectTo && !url.searchParams.has('client_id')) {
		redirect(302, `${env.PUBLIC_LANDING_URL ?? ''}/apps`);
	}

	return {
		user: { name: session.user.name, email: session.user.email, image: session.user.image }
	};
};
