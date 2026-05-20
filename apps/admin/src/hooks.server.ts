import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { getAuth } from '$lib/server/auth';
import {
	db,
	initDb,
	registerShutdown,
	users,
	userAppAccess,
	withUser,
	loadUserLocale
} from '@nexo/db';
import { and, eq } from 'drizzle-orm';
import { initPush, sendToUser } from '@nexo/push/server';
import { csrfHandle } from '@nexo/security';
import { ensureUserLocaleCookie } from '@nexo/i18n';
import { dev, building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { paraglideMiddleware } from '$lib/paraglide/server.js';
import { getTextDirection } from '$lib/paraglide/runtime.js';
import { logger } from '$lib/server/logger';
import { setHealthAlertCallbacks, startHealthPoller } from '$lib/server/health-poller';

initDb(env.DATABASE_URL!);
registerShutdown();

const ADMIN_EMAIL = env.ADMIN_EMAIL;
if (!ADMIN_EMAIL) throw new Error('ADMIN_EMAIL environment variable is required');

if (env.VAPID_SUBJECT && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
	initPush({
		subject: env.VAPID_SUBJECT,
		publicKey: env.VAPID_PUBLIC_KEY,
		privateKey: env.VAPID_PRIVATE_KEY
	});
}

const ADMIN_URL = publicEnv.PUBLIC_ADMIN_URL ?? 'https://admin.krieger2501.de';

let ownerUserIdPromise: Promise<string | null> | null = null;
async function getOwnerUserId(): Promise<string | null> {
	ownerUserIdPromise ??= (async () => {
		const rows = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.email, ADMIN_EMAIL!))
			.limit(1)
			.catch(() => []);
		const ownerId = rows[0]?.id ?? null;
		// Self-heal: ensure the owner always has 'admin' app access. Idempotent.
		if (ownerId) {
			await db
				.insert(userAppAccess)
				.values({ userId: ownerId, app: 'admin' })
				.onConflictDoNothing()
				.catch((e) => logger.error('owner admin grant failed', { error: String(e) }));
		}
		return ownerId;
	})();
	return ownerUserIdPromise;
}

setHealthAlertCallbacks({
	onTransitionToFail: async (target, errMsg) => {
		const userId = await getOwnerUserId();
		if (!userId) return;
		await sendToUser(userId, 'admin', {
			title: `🔴 ${target} is unhealthy`,
			body: errMsg ?? 'Health check failed',
			tag: `health:${target}`,
			url: `${ADMIN_URL}/services/${encodeURIComponent(target)}`
		}).catch((e) => logger.error('alert push failed', { target, error: String(e) }));
	},
	onTransitionToOk: async (target) => {
		const userId = await getOwnerUserId();
		if (!userId) return;
		await sendToUser(userId, 'admin', {
			title: `✅ ${target} recovered`,
			body: 'Health check passing again',
			tag: `health:${target}`,
			url: `${ADMIN_URL}/services/${encodeURIComponent(target)}`
		}).catch((e) => logger.error('recovery push failed', { target, error: String(e) }));
	}
});

if (!building) {
	startHealthPoller();
	// Fire-and-forget owner seed at startup so the ADMIN_EMAIL user is never locked out.
	void getOwnerUserId();
}

const appHandle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/_app/')) return resolve(event);
	if (event.url.pathname === '/healthz') return resolve(event);

	event.locals.correlationId ??= crypto.randomUUID().slice(0, 8);

	const auth = getAuth();
	const session = await auth.api.getSession({ headers: event.request.headers });
	event.locals.user = session?.user ?? null;

	if (!event.locals.user) {
		const adminURL = publicEnv.PUBLIC_ADMIN_URL ?? `${event.url.protocol}//${event.url.host}`;
		const redirectTo = encodeURIComponent(`${adminURL}${event.url.pathname}${event.url.search}`);
		redirect(303, `${auth.options.baseURL}/login?redirectTo=${redirectTo}`);
	}

	const userId = event.locals.user.id;
	const access = await withUser(userId, (tx) =>
		tx
			.select()
			.from(userAppAccess)
			.where(and(eq(userAppAccess.userId, userId), eq(userAppAccess.app, 'admin')))
			.limit(1)
	);

	if (access.length === 0) {
		logger.warn('app access denied', { email: event.locals.user.email, app: 'admin' });
		redirect(303, `${auth.options.baseURL}/not-authorized-app?app=admin`);
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
