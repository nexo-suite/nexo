import type { RequestHandler } from '@sveltejs/kit';
import { json, error } from '@sveltejs/kit';
import { db, pushSubscription } from '@nexo/db';
import { createLogger } from '@nexo/logger';
import { and, eq } from 'drizzle-orm';
import { sendToUser, type PushPayload } from './server.js';

const logger = createLogger('push');

type SessionUser = { id: string; email: string; name: string };
type LocalsWithUser = { user?: SessionUser | null; correlationId?: string };

type SubscribeBody = {
	subscription: {
		endpoint: string;
		keys: { p256dh: string; auth: string };
	};
	label?: string;
};

function parseSubscribe(body: unknown): SubscribeBody | null {
	if (typeof body !== 'object' || body === null) return null;
	const b = body as Record<string, unknown>;
	const sub = b.subscription as Record<string, unknown> | undefined;
	if (!sub || typeof sub.endpoint !== 'string') return null;
	const keys = sub.keys as Record<string, unknown> | undefined;
	if (!keys || typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string') return null;
	return {
		subscription: {
			endpoint: sub.endpoint,
			keys: { p256dh: keys.p256dh, auth: keys.auth }
		},
		label: typeof b.label === 'string' ? b.label : undefined
	};
}

function endpointHost(endpoint: string): string {
	try {
		return new URL(endpoint).host;
	} catch {
		return 'invalid-url';
	}
}

export function subscribeHandler(app: string): RequestHandler {
	return async ({ request, locals }) => {
		const l = locals as LocalsWithUser;
		const user = l.user;
		const correlationId = l.correlationId;
		if (!user) {
			logger.warn('subscribe: unauthorized', { app, correlationId });
			throw error(401, 'unauthorized');
		}

		const body = parseSubscribe(await request.json().catch(() => null));
		if (!body) {
			logger.warn('subscribe: invalid body', { app, userId: user.id, correlationId });
			throw error(400, 'invalid subscription');
		}

		const userAgent = request.headers.get('user-agent') ?? null;
		const host = endpointHost(body.subscription.endpoint);

		await db
			.insert(pushSubscription)
			.values({
				userId: user.id,
				app,
				endpoint: body.subscription.endpoint,
				p256dh: body.subscription.keys.p256dh,
				auth: body.subscription.keys.auth,
				userAgent,
				label: body.label ?? null,
				lastUsedAt: new Date()
			})
			.onConflictDoUpdate({
				target: [pushSubscription.userId, pushSubscription.app, pushSubscription.endpoint],
				set: {
					p256dh: body.subscription.keys.p256dh,
					auth: body.subscription.keys.auth,
					userAgent,
					label: body.label ?? null,
					lastUsedAt: new Date()
				}
			});

		logger.info('subscribe: stored', {
			correlationId,
			userId: user.id,
			app,
			endpointHost: host,
			label: body.label ?? null
		});

		return json({ ok: true });
	};
}

export function unsubscribeHandler(app: string): RequestHandler {
	return async ({ request, locals }) => {
		const l = locals as LocalsWithUser;
		const user = l.user;
		const correlationId = l.correlationId;
		if (!user) {
			logger.warn('unsubscribe: unauthorized', { app, correlationId });
			throw error(401, 'unauthorized');
		}

		const body = (await request.json().catch(() => null)) as { endpoint?: string } | null;
		if (!body?.endpoint) {
			logger.warn('unsubscribe: missing endpoint', { app, userId: user.id, correlationId });
			throw error(400, 'missing endpoint');
		}

		const host = endpointHost(body.endpoint);

		const result = await db
			.delete(pushSubscription)
			.where(
				and(
					eq(pushSubscription.userId, user.id),
					eq(pushSubscription.app, app),
					eq(pushSubscription.endpoint, body.endpoint)
				)
			);

		logger.info('unsubscribe: removed', {
			correlationId,
			userId: user.id,
			app,
			endpointHost: host,
			rowCount: (result as { rowCount?: number }).rowCount ?? null
		});

		return json({ ok: true });
	};
}

export type TestPayloadFactory = (user: SessionUser) => PushPayload;

export function testHandler(app: string, payloadFor: TestPayloadFactory): RequestHandler {
	return async ({ locals }) => {
		const l = locals as LocalsWithUser;
		const user = l.user;
		const correlationId = l.correlationId;
		if (!user) {
			logger.warn('test: unauthorized', { app, correlationId });
			throw error(401, 'unauthorized');
		}
		logger.info('test: invoked', { correlationId, userId: user.id, app });
		const result = await sendToUser(user.id, app, payloadFor(user), { correlationId });
		return json({ ok: true, ...result });
	};
}
