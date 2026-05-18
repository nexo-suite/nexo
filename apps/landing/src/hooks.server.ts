import { initDb } from '@nexo/db';
import { csrfHandle } from '@nexo/security';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { getAuth } from '$lib/server/auth';
import { paraglideMiddleware } from '$lib/paraglide/server.js';
import { getTextDirection } from '$lib/paraglide/runtime.js';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

initDb(env.DATABASE_URL!);

const i18nHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;
		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html.replace('%lang%', locale).replace('%dir%', getTextDirection(locale))
		});
	});

const appHandle: Handle = async ({ event, resolve }) => {
	const auth = getAuth();
	const result = await auth.api.getSession({ headers: event.request.headers }).catch(() => null);
	event.locals.user = result?.user ?? null;
	event.locals.session = result?.session ?? null;
	return resolve(event);
};

const securityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
	response.headers.set(
		'Permissions-Policy',
		'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=()'
	);
	return response;
};

export const handle = sequence(
	i18nHandle,
	csrfHandle({ allowLocalhost: dev }),
	appHandle,
	securityHeaders
);
