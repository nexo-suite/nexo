import webpush from 'web-push';
import { db, pushSubscription } from '@nexo/db';
import { createLogger } from '@nexo/logger';
import { and, eq } from 'drizzle-orm';

const logger = createLogger('push');

export type VapidConfig = {
	subject: string;
	publicKey: string;
	privateKey: string;
};

let configured = false;

export function initPush(config: VapidConfig): void {
	if (!config.subject || !config.publicKey || !config.privateKey) {
		throw new Error('initPush: subject, publicKey, privateKey are all required');
	}
	webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
	configured = true;
	logger.info('initPush configured', {
		subject: config.subject,
		publicKeyFingerprint: config.publicKey.slice(0, 8) + '…' + config.publicKey.slice(-4),
		publicKeyLength: config.publicKey.length
	});
}

function ensureConfigured(): void {
	if (!configured) {
		throw new Error(
			'Push not configured. Call initPush({ subject, publicKey, privateKey }) at app boot.'
		);
	}
}

export type PushPayload = {
	title: string;
	body?: string;
	icon?: string;
	badge?: string;
	tag?: string;
	url?: string;
	data?: Record<string, unknown>;
	requireInteraction?: boolean;
	silent?: boolean;
	vibrate?: number[];
};

export type SendResult = {
	sent: number;
	pruned: number;
	failed: number;
};

function endpointHost(endpoint: string): string {
	try {
		return new URL(endpoint).host;
	} catch {
		return 'invalid-url';
	}
}

export async function sendToUser(
	userId: string,
	app: string,
	payload: PushPayload,
	opts: { correlationId?: string } = {}
): Promise<SendResult> {
	ensureConfigured();
	const { correlationId } = opts;
	const subs = await db
		.select()
		.from(pushSubscription)
		.where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.app, app)));

	logger.info('sendToUser: lookup', {
		correlationId,
		userId,
		app,
		subscriptionCount: subs.length,
		title: payload.title
	});

	if (subs.length === 0) {
		logger.warn('sendToUser: no subscriptions — push will not be delivered', {
			correlationId,
			userId,
			app
		});
		return { sent: 0, pruned: 0, failed: 0 };
	}

	const json = JSON.stringify(payload);
	let sent = 0;
	let pruned = 0;
	let failed = 0;

	await Promise.all(
		subs.map(async (s) => {
			const host = endpointHost(s.endpoint);
			try {
				await webpush.sendNotification(
					{ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
					json
				);
				await db
					.update(pushSubscription)
					.set({ lastUsedAt: new Date() })
					.where(eq(pushSubscription.id, s.id));
				sent++;
				logger.info('sendToUser: delivered', {
					correlationId,
					userId,
					app,
					subscriptionId: s.id,
					endpointHost: host
				});
			} catch (err: unknown) {
				const e = err as { statusCode?: number; body?: string; message?: string };
				const status = e?.statusCode;
				if (status === 404 || status === 410) {
					await db.delete(pushSubscription).where(eq(pushSubscription.id, s.id));
					pruned++;
					logger.info('sendToUser: pruned stale subscription', {
						correlationId,
						userId,
						app,
						subscriptionId: s.id,
						endpointHost: host,
						statusCode: status
					});
				} else {
					failed++;
					logger.error('sendToUser: dispatch failed', {
						correlationId,
						userId,
						app,
						subscriptionId: s.id,
						endpointHost: host,
						statusCode: status,
						body: e?.body,
						error: e?.message ?? String(err)
					});
				}
			}
		})
	);

	logger.info('sendToUser: summary', {
		correlationId,
		userId,
		app,
		sent,
		pruned,
		failed,
		total: subs.length
	});

	return { sent, pruned, failed };
}
