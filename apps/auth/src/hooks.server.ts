import { getAuth } from '$lib/server/auth';
import { initDb } from '@nexo/db';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/server/logger';
import type { Handle } from '@sveltejs/kit';

initDb(env.DATABASE_URL!);

export const handle: Handle = async ({ event, resolve }) => {
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
