import { auth } from '$lib/server/auth';
import { initDb } from '@nexo/db';
import { DATABASE_URL } from '$env/dynamic/private';
import { type Handle } from '@sveltejs/kit';

initDb(DATABASE_URL);

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/auth') || event.url.pathname.startsWith('/oauth2')) {
		return auth.handler(event.request);
	}
	return resolve(event);
};
