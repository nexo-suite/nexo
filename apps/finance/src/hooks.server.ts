import { redirect, type Handle } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { initDb } from '@nexo/db';

initDb(process.env.DATABASE_URL!);

export const handle: Handle = async ({ event, resolve }) => {
	// Skip session check for static assets
	if (event.url.pathname.startsWith('/_app/')) return resolve(event);

	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = session?.user ?? null;

	if (!event.locals.user && !event.url.pathname.startsWith('/auth')) {
		const redirectTo = encodeURIComponent(event.url.href);
		redirect(303, `${auth.options.baseURL}/login?redirectTo=${redirectTo}`);
	}

	return resolve(event);
};
