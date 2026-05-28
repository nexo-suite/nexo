// HMAC-authenticated direct-POST endpoint for trusted internal callers
// (currently: the nexo CLI in CI, after `build-images --push`).
//
// Replaces the GHCR `package.published` webhook path which was unreliable —
// GHCR fires events with empty `tag.name` for manifest-creation, doesn't
// always fire on retags, and delivery is selective even with packages
// linked to the repo. The CLI knows which `:pr-N` tags it just pushed
// without having to infer anything; this endpoint lets it tell us directly.
//
// Wire format:
//   POST /cli-event
//   X-Nexo-Signature: sha256=<hex hmac-sha256 of raw body>
//   { "kind": "image-ready", "app": <UnstableApp>, "prNumber": <number>, "tag": "pr-<n>" }

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createLogger } from '@nexo/logger';
import { getInstallationOctokit, upsertStickyComment, type Env } from './github.js';
import { reconcile } from './reconcile.js';
import { renderComment } from './comment.js';
import { getPRState, setPRState, withPRLock, UNSTABLE_APPS, type UnstableApp } from './state.js';

const logger = createLogger('bot');

type ImageReadyPayload = {
	kind: 'image-ready';
	app: UnstableApp;
	prNumber: number;
	tag: string;
};

export async function handleCliEvent(
	req: IncomingMessage,
	res: ServerResponse,
	env: Env,
	secret: string
): Promise<void> {
	if (req.method !== 'POST') {
		res.writeHead(405).end();
		return;
	}

	let raw: Buffer;
	try {
		raw = await readBody(req);
	} catch (e) {
		logger.warn('cli-event: body read failed', { error: String(e) });
		res.writeHead(400).end();
		return;
	}

	const sigHeader = req.headers['x-nexo-signature'];
	if (typeof sigHeader !== 'string' || !verifyHmac(raw, sigHeader, secret)) {
		res.writeHead(401).end();
		return;
	}

	let payload: unknown;
	try {
		payload = JSON.parse(raw.toString('utf8'));
	} catch {
		res.writeHead(400).end();
		return;
	}

	const event = parseImageReady(payload);
	if (!event) {
		res.writeHead(400).end();
		return;
	}

	// Respond fast; processing is async and self-contained. The CLI side
	// retries on 5xx but expects a quick ack on success.
	res.writeHead(202).end();

	try {
		await onImageReady(env, event);
	} catch (e) {
		logger.error('cli-event: handler failed', {
			prNumber: event.prNumber,
			app: event.app,
			error: String(e)
		});
	}
}

async function onImageReady(env: Env, event: ImageReadyPayload): Promise<void> {
	const { app, prNumber, tag } = event;

	await withPRLock(prNumber, async () => {
		const state = getPRState(prNumber);
		if (!state) {
			// Direct POST landed before the bot saw `pull_request.opened` for this
			// PR. The eventual opened/reopened handler will probe the registry on
			// its own and pick up the (now-pushed) image, so dropping here is safe.
			logger.warn('image-ready: no PR state', { prNumber, app, tag });
			return;
		}

		const wasReady = state.images[app] === 'ready';
		state.images[app] = 'ready';
		setPRState(state);
		if (!wasReady) logger.info('image-ready', { prNumber, app, tag });

		const octokit = await getInstallationOctokit(env);

		if (!wasReady && state.intent[app]) {
			// Image just transitioned to ready AND the maintainer wants it up —
			// dispatch the deployment. Two scenarios converge:
			//   1. Box was ticked before image was ready → reconcile would
			//      otherwise do nothing because intent didn't change, so we pass
			//      `forceApps` to make it dispatch.
			//   2. Same intent across a `pull_request.synchronize` (new commits) →
			//      same handling: redeploy onto the new image.
			await reconcile({ octokit, env, prNumber, forceApps: [app] });
		} else {
			// Always refresh the sticky, even on duplicate "ready" events. Patching
			// is cheap (well under rate limit) and gives us self-healing if the
			// state and comment ever drift (mid-PATCH crash, network blip).
			const body = renderComment({ state, otherPRPins: {} });
			await upsertStickyComment(octokit, env, state, body);
		}
	});
}

function parseImageReady(value: unknown): ImageReadyPayload | null {
	if (!value || typeof value !== 'object') return null;
	const obj = value as Record<string, unknown>;
	if (obj.kind !== 'image-ready') return null;
	if (typeof obj.app !== 'string' || !UNSTABLE_APPS.includes(obj.app as UnstableApp)) return null;
	if (typeof obj.prNumber !== 'number' || !Number.isInteger(obj.prNumber) || obj.prNumber <= 0) {
		return null;
	}
	if (typeof obj.tag !== 'string' || !obj.tag) return null;
	return {
		kind: 'image-ready',
		app: obj.app as UnstableApp,
		prNumber: obj.prNumber,
		tag: obj.tag
	};
}

function verifyHmac(body: Buffer, header: string, secret: string): boolean {
	const expected = createHmac('sha256', secret).update(body).digest('hex');
	const provided = header.startsWith('sha256=') ? header.slice('sha256='.length) : header;
	if (provided.length !== expected.length) return false;
	try {
		return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
	} catch {
		return false;
	}
}

function readBody(req: IncomingMessage): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		let total = 0;
		const MAX = 64 * 1024; // 64KiB cap — payloads are tiny
		req.on('data', (chunk: Buffer) => {
			total += chunk.length;
			if (total > MAX) {
				req.destroy();
				reject(new Error('body too large'));
				return;
			}
			chunks.push(chunk);
		});
		req.on('end', () => resolve(Buffer.concat(chunks)));
		req.on('error', reject);
	});
}
