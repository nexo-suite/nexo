import { getAuth } from '$lib/server/auth';
import { initDb } from '@nexo/db';
import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';

initDb(env.DATABASE_URL!);

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/auth') || event.url.pathname.startsWith('/oauth2')) {
		return getAuth().handler(event.request);
	}
	return resolve(event);
};
