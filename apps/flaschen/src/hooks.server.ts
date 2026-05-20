import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { getAuth } from '$lib/server/auth';
import { initDb, registerShutdown, withUser, userAppAccess, loadUserLocale } from '@nexo/db';
import { initPush } from '@nexo/push/server';
import { csrfHandle } from '@nexo/security';
import { ensureUserLocaleCookie } from '@nexo/i18n';
import { and, eq } from 'drizzle-orm';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { logger } from '$lib/server/logger';
import { paraglideMiddleware } from '$lib/paraglide/server.js';
import { getTextDirection } from '$lib/paraglide/runtime.js';
import { setFlaschenpostEnv } from '$lib/server/flaschenpost/env';

initDb(env.DATABASE_URL!);
registerShutdown();
initPush({
	subject: env.VAPID_SUBJECT!,
	publicKey: env.VAPID_PUBLIC_KEY!,
	privateKey: env.VAPID_PRIVATE_KEY!
});
setFlaschenpostEnv(env);

const APP = 'flaschen';

const appHandle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/_app/')) return resolve(event);
	if (event.url.pathname === '/healthz') return resolve(event);

	event.locals.correlationId ??= crypto.randomUUID().slice(0, 8);

	const auth = getAuth();
	const session = await auth.api.getSession({ headers: event.request.headers });
	logger.info('getSession', { email: session?.user?.email ?? null, path: event.url.pathname });
	event.locals.user = session?.user ?? null;

	if (!event.locals.user && !event.url.pathname.startsWith('/auth')) {
		const flaschenURL = publicEnv.PUBLIC_FLASCHEN_URL ?? `${event.url.protocol}//${event.url.host}`;
		const redirectTo = encodeURIComponent(`${flaschenURL}${event.url.pathname}${event.url.search}`);
		logger.warn('auth required', { path: event.url.pathname });
		redirect(303, `${auth.options.baseURL}/login?redirectTo=${redirectTo}`);
	}

	if (event.locals.user && !event.url.pathname.startsWith('/auth')) {
		const userId = event.locals.user.id;
		const access = await withUser(userId, (tx) =>
			tx
				.select()
				.from(userAppAccess)
				.where(and(eq(userAppAccess.userId, userId), eq(userAppAccess.app, APP)))
				.limit(1)
		);

		if (access.length === 0) {
			logger.warn('app access denied', { email: event.locals.user.email, app: APP });
			redirect(303, `${auth.options.baseURL}/not-authorized-app?app=${APP}`);
		}
	}

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

const i18nHandle: Handle = async ({ event, resolve }) => {
	await ensureUserLocaleCookie(event, {
		getSession: (request) => getAuth().api.getSession({ headers: request.headers }),
		loadLocale: loadUserLocale
	});
	return paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;
		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html.replace('%lang%', locale).replace('%dir%', getTextDirection(locale))
		});
	});
};

export const handle = sequence(
	i18nHandle,
	csrfHandle({ allowLocalhost: dev }),
	appHandle,
	securityHeaders
);
