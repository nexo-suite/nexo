import { error, redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { getAuth } from '$lib/server/auth';
import { initDb } from '@nexo/db';
import { csrfHandle } from '@nexo/security';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { paraglideMiddleware } from '$lib/paraglide/server.js';
import { getTextDirection } from '$lib/paraglide/runtime.js';

initDb(env.DATABASE_URL!);

const ADMIN_EMAIL = env.ADMIN_EMAIL;
if (!ADMIN_EMAIL) throw new Error('ADMIN_EMAIL environment variable is required');

const appHandle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/_app/')) return resolve(event);

	event.locals.correlationId ??= crypto.randomUUID().slice(0, 8);

	const auth = getAuth();
	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = session?.user ?? null;

	if (!event.locals.user) {
		const adminURL = publicEnv.PUBLIC_ADMIN_URL ?? `${event.url.protocol}//${event.url.host}`;
		const redirectTo = encodeURIComponent(`${adminURL}${event.url.pathname}${event.url.search}`);
		redirect(303, `${auth.options.baseURL}/login?redirectTo=${redirectTo}`);
	}

	if (event.locals.user.email !== ADMIN_EMAIL) {
		error(403, {
			message: 'Forbidden',
			code: 'FORBIDDEN',
			correlationId: event.locals.correlationId
		});
	}

	return resolve(event);
};

const securityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	return response;
};

const i18nHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;
		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html.replace('%lang%', locale).replace('%dir%', getTextDirection(locale))
		});
	});

export const handle = sequence(
	i18nHandle,
	csrfHandle({ allowLocalhost: dev }),
	appHandle,
	securityHeaders
);
