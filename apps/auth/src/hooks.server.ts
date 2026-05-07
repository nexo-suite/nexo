import { auth } from '$lib/server/auth';
import { initDb } from '@nexo/db';
import { type Handle } from '@sveltejs/kit';

initDb(process.env.DATABASE_URL!);

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/auth') || event.url.pathname.startsWith('/oauth2')) {
		return auth.handler(event.request);
	}
	return resolve(event);
};
