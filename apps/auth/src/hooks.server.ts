import { getAuth } from '$lib/server/auth';
import { initDb } from '@nexo/db';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/server/logger';
import { paraglideMiddleware } from '$lib/paraglide/server.js';
import { getTextDirection } from '$lib/paraglide/runtime.js';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

initDb(env.DATABASE_URL!);

const authHandle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api/auth') || event.url.pathname.startsWith('/oauth2')) {
		const correlationId = crypto.randomUUID().slice(0, 8);
		try {
			const response = await getAuth().handler(event.request);
			if (response.status >= 500) {
				logger.error('auth handler error', {
					status: response.status,
					path: event.url.pathname,
					correlationId
				});
				return Response.redirect(
					new URL(`/login?error=server_error&id=${correlationId}`, event.url),
					302
				);
			}
			return response;
		} catch (e) {
			logger.error('auth handler exception', {
				error: String(e),
				path: event.url.pathname,
				correlationId
			});
			return Response.redirect(
				new URL(`/login?error=server_error&id=${correlationId}`, event.url),
				302
			);
		}
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

export const handle = sequence(i18nHandle, authHandle, securityHeaders);
