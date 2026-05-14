import { error, redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { getAuth } from '$lib/server/auth';
import { initDb } from '@nexo/db';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { i18n } from '$lib/i18n';

initDb(env.DATABASE_URL!);

const ADMIN_EMAIL = env.ADMIN_EMAIL;
if (!ADMIN_EMAIL) throw new Error('ADMIN_EMAIL environment variable is required');

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

const appHandle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/_app/')) return resolve(event);

	event.locals.correlationId = crypto.randomUUID().slice(0, 8);

	const { method, headers } = event.request;
	if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
		const origin = headers.get('origin');
		const contentType = headers.get('content-type') ?? '';
		const isFormSubmission =
			contentType.includes('application/x-www-form-urlencoded') ||
			contentType.includes('multipart/form-data') ||
			contentType.includes('text/plain');
		if (isFormSubmission && origin && !isAllowedOrigin(origin)) {
			error(403, {
				message: 'CSRF rejected',
				code: 'CSRF_REJECTED',
				correlationId: event.locals.correlationId
			});
		}
	}

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

export const handle = sequence(i18n.handle(), appHandle);
