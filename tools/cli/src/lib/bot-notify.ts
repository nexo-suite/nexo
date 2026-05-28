// Trusted internal HTTP client to signal the bot from CI.
//
// The bot exposes a `/cli-event` endpoint authenticated with HMAC-SHA256
// (mirroring GitHub's webhook signature scheme). After `build-images` pushes
// a `:pr-N` tag, this helper notifies the bot directly so the sticky comment
// flips ⏳ → ✅ without depending on GHCR's flaky `package.published` events.
//
// Behaviour:
//   • Local dev (NEXO_BOT_URL + NEXO_BOT_SECRET both unset) → return silently.
//   • CI (`GITHUB_ACTIONS=true`) but missing config → throw (loud failure).
//   • Otherwise: POST in parallel with retries on network errors and 5xx.

import { createHmac } from 'node:crypto';
import { info, fail } from './log.ts';

export type ImageReadyEvent = {
	app: string;
	prNumber: number;
	tag: string;
};

const RETRY_BACKOFFS_MS = [1000, 2000, 4000];
const REQUEST_TIMEOUT_MS = 5000;

export async function notifyImagesReady(events: readonly ImageReadyEvent[]): Promise<void> {
	if (events.length === 0) return;

	const url = process.env.NEXO_BOT_URL;
	const secret = process.env.NEXO_BOT_SECRET;
	const inCI = process.env.GITHUB_ACTIONS === 'true' || process.env.CI === 'true';

	if (!url || !secret) {
		if (inCI) {
			fail(
				`bot-notify: missing ${!url ? 'NEXO_BOT_URL' : ''}${!url && !secret ? ' and ' : ''}${!secret ? 'NEXO_BOT_SECRET' : ''} in CI`
			);
		}
		// Local dev: silent skip — there's no bot to notify outside CI.
		return;
	}

	const endpoint = `${url.replace(/\/$/, '')}/cli-event`;

	const results = await Promise.allSettled(
		events.map((event) => postWithRetry(endpoint, secret, event))
	);

	const failures = results
		.map((r, i) => ({ r, event: events[i]! }))
		.filter(({ r }) => r.status === 'rejected');

	if (failures.length > 0) {
		const summary = failures
			.map(({ r, event }) => {
				const reason = r.status === 'rejected' ? String(r.reason) : '';
				return `${event.app}#${event.prNumber}: ${reason}`;
			})
			.join('; ');
		fail(`bot-notify: ${failures.length}/${events.length} failed — ${summary}`);
	}

	info(`bot-notify: signalled ${events.length} image-ready event(s)`);
}

async function postWithRetry(
	endpoint: string,
	secret: string,
	event: ImageReadyEvent
): Promise<void> {
	const body = JSON.stringify({
		kind: 'image-ready',
		app: event.app,
		prNumber: event.prNumber,
		tag: event.tag
	});
	const sig = createHmac('sha256', secret).update(body).digest('hex');

	let lastError: unknown;
	for (let attempt = 0; attempt <= RETRY_BACKOFFS_MS.length; attempt++) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
		try {
			const res = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'x-nexo-signature': `sha256=${sig}`
				},
				body,
				signal: controller.signal
			});
			if (res.status >= 200 && res.status < 300) return;
			// 4xx is not retriable — bail immediately. Misconfigured secret or
			// stale bot deployment without /cli-event will land here.
			if (res.status >= 400 && res.status < 500) {
				throw new Error(`HTTP ${res.status}`);
			}
			lastError = new Error(`HTTP ${res.status}`);
		} catch (e) {
			lastError = e;
			// 4xx errors are non-retriable — surface them now so we don't burn
			// the full retry budget on a bad request.
			if (e instanceof Error && /^HTTP 4\d\d$/.test(e.message)) throw e;
		} finally {
			clearTimeout(timer);
		}

		const backoff = RETRY_BACKOFFS_MS[attempt];
		if (backoff === undefined) break;
		await sleep(backoff);
	}

	throw lastError ?? new Error('unknown error');
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
