import { error, redirect, type Handle } from '@sveltejs/kit';
import { getAuth } from '$lib/server/auth';
import { initDb } from '@nexo/db';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

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
	event.locals.user = session?.user ?? null;

	if (!event.locals.user && !event.url.pathname.startsWith('/auth')) {
		const financeURL = publicEnv.PUBLIC_FINANCE_URL ?? `${event.url.protocol}//${event.url.host}`;
		const redirectTo = encodeURIComponent(`${financeURL}${event.url.pathname}${event.url.search}`);
		redirect(303, `${auth.options.baseURL}/login?redirectTo=${redirectTo}`);
	}

	return resolve(event);
};
