import { error, redirect, type Handle } from '@sveltejs/kit';
import { getAuth } from '$lib/server/auth';
import { initDb, db, userAppAccess } from '@nexo/db';
import { and, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { logger } from '$lib/server/logger';

initDb(env.DATABASE_URL!);

function isAllowedOrigin(origin: string): boolean {
	try {
		const { hostname } = new URL(origin);
		return (
			hostname === 'localhost' ||
			hostname.endsWith('.krieger2501.de') ||
			hostname === 'krieger2501.de'
		);
	} catch {
		return false;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/_app/')) return resolve(event);

	event.locals.correlationId = crypto.randomUUID().slice(0, 8);

	// Custom CSRF check
	const { method, headers } = event.request;
	if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
		const origin = headers.get('origin');
		const contentType = headers.get('content-type') ?? '';
		const isFormSubmission =
			contentType.includes('application/x-www-form-urlencoded') ||
			contentType.includes('multipart/form-data') ||
			contentType.includes('text/plain');
		if (isFormSubmission && origin && !isAllowedOrigin(origin)) {
			error(403, `Cross-site ${method} form submissions are forbidden`);
		}
	}

	const auth = getAuth();
	const session = await auth.api.getSession({ headers: event.request.headers });
	logger.info('getSession', { email: session?.user?.email ?? null, path: event.url.pathname });
	event.locals.user = session?.user ?? null;

	if (!event.locals.user && !event.url.pathname.startsWith('/auth')) {
		const financeURL = publicEnv.PUBLIC_FINANCE_URL ?? `${event.url.protocol}//${event.url.host}`;
		const redirectTo = encodeURIComponent(`${financeURL}${event.url.pathname}${event.url.search}`);
		logger.warn('auth required', { path: event.url.pathname });
		redirect(303, `${auth.options.baseURL}/login?redirectTo=${redirectTo}`);
	}

	if (event.locals.user && !event.url.pathname.startsWith('/auth')) {
		const access = await db
			.select()
			.from(userAppAccess)
			.where(and(eq(userAppAccess.userId, event.locals.user.id), eq(userAppAccess.app, 'finance')))
			.limit(1);

		if (access.length === 0) {
			logger.warn('app access denied', { email: event.locals.user.email, app: 'finance' });
			redirect(303, `${auth.options.baseURL}/not-authorized-app?app=finance`);
		}
	}

	return resolve(event);
};
