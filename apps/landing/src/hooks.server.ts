import { initDb } from '@nexo/db';
import { env } from '$env/dynamic/private';
import { getAuth } from '$lib/server/auth';
import { i18n } from '$lib/i18n';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

initDb(env.DATABASE_URL!);

const appHandle: Handle = async ({ event, resolve }) => {
	const auth = getAuth();
	const session = await auth.api.getSession({ headers: event.request.headers }).catch(() => null);
	event.locals.user = session?.user ?? null;
	return resolve(event);
};

export const handle = sequence(i18n.handle(), appHandle);
