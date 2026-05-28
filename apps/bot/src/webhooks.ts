// Webhook event handlers. The thin layer between Octokit's payload shape
// and the reconciler. Every mutation goes through `withPRLock` so checkbox
// toggles for the same PR can't race each other, and every mutation goes
// through `isMaintainer` first so non-maintainers can't drive the bot.

import type { Webhooks } from '@octokit/webhooks';
import { createLogger } from '@nexo/logger';
import { extractPRFromMarker, parseIntent } from './comment.js';
import {
	getInstallationOctokit,
	probeImageReadiness,
	upsertStickyComment,
	type Env
} from './github.js';
import { isMaintainer } from './permissions.js';
import {
	UNSTABLE_APPS,
	freshImages,
	freshIntent,
	getPRState,
	setPRState,
	withPRLock,
	type UnstableApp
} from './state.js';
import { ensurePRState, onPRClosed, reconcile, resetAllAfterDeploy } from './reconcile.js';
import { renderComment } from './comment.js';

const logger = createLogger('bot');
const UNSTABLE_WORKFLOW_PATH_SUFFIX = '/unstable.yml';
const CI_WORKFLOW_PATH_SUFFIX = '/ci.yml';

export function registerWebhooks(webhooks: Webhooks, env: Env): void {
	webhooks.on(['pull_request.opened', 'pull_request.reopened'], async ({ payload }) => {
		const prNumber = payload.pull_request.number;
		const headSha = payload.pull_request.head.sha;
		await withPRLock(prNumber, async () => {
			try {
				const octokit = await getInstallationOctokit(env);
				const ready = await probeImageReadiness(octokit, env, prNumber);
				const images = freshImages();
				for (const app of UNSTABLE_APPS) if (ready[app]) images[app] = 'ready';

				const state = ensurePRState(prNumber, {
					commentId: 0,
					headSha,
					images,
					intent: freshIntent(),
					activity: {}
				});
				state.headSha = headSha;
				state.images = images;
				setPRState(state);

				const body = renderComment({ state, otherPRPins: {} });
				await upsertStickyComment(octokit, env, state, body);
			} catch (e) {
				logger.error('failed to initialise sticky comment', { prNumber, error: String(e) });
			}
		});
	});

	webhooks.on('pull_request.synchronize', async ({ payload }) => {
		const prNumber = payload.pull_request.number;
		const newSha = payload.pull_request.head.sha;
		await withPRLock(prNumber, async () => {
			const state = getPRState(prNumber);
			if (!state) return;
			state.headSha = newSha;
			// New commits → fresh `:pr-<n>` builds will publish; reset image
			// readiness to pending and let package.published re-flip them. The
			// package handler will auto-redeploy services whose intent is still
			// true once the new image lands.
			state.images = freshImages();
			setPRState(state);
			try {
				const octokit = await getInstallationOctokit(env);
				const body = renderComment({ state, otherPRPins: {} });
				await upsertStickyComment(octokit, env, state, body);
			} catch (e) {
				logger.error('failed to update sticky on sync', { prNumber, error: String(e) });
			}
		});
	});

	webhooks.on('pull_request.closed', async ({ payload }) => {
		const prNumber = payload.pull_request.number;
		await withPRLock(prNumber, async () => {
			try {
				const octokit = await getInstallationOctokit(env);
				await onPRClosed(octokit, env, prNumber);
			} catch (e) {
				logger.error('failed to handle pr close', { prNumber, error: String(e) });
			}
		});
	});

	webhooks.on('issue_comment.edited', async ({ payload }) => {
		// Skip our own edits — the bot patches the sticky after every reconcile,
		// and GitHub fires `issue_comment.edited` for the bot's PATCH just like
		// for a human's. Without this guard, every bot edit triggers another
		// reconcile + edit, burning rate limit and inflating the comment's
		// edit-count (we hit 589 once before this filter landed).
		if (payload.sender.type === 'Bot') return;

		const body = payload.comment.body ?? '';
		const prNumber = extractPRFromMarker(body);
		if (!prNumber) return;
		const sender = payload.sender.login;

		await withPRLock(prNumber, async () => {
			try {
				const octokit = await getInstallationOctokit(env);
				if (!(await isMaintainer(octokit, env.owner, env.repo, sender))) {
					// Silently revert any unauthorized checkbox flip. The reverted
					// sticky is its own rejection signal — no separate reply needed.
					const state = getPRState(prNumber);
					if (state) {
						const reverted = renderComment({ state, otherPRPins: {} });
						await upsertStickyComment(octokit, env, state, reverted);
					}
					return;
				}
				const intent = parseIntent(body);
				ensurePRState(prNumber, {
					commentId: payload.comment.id,
					headSha: '',
					images: freshImages(),
					intent: freshIntent(),
					activity: {}
				});
				await reconcile({ octokit, env, prNumber, intentOverride: intent });
			} catch (e) {
				logger.error('failed to apply checkbox edit', { prNumber, error: String(e) });
			}
		});
	});

	async function onContainerReady(
		pkgName: string,
		packageType: string,
		ownerLogin: string,
		tag: string
	) {
		if (packageType !== 'container') return;
		if (ownerLogin.toLowerCase() !== env.owner.toLowerCase()) return;
		if (!pkgName.startsWith('nexo-')) return;
		const app = pkgName.slice('nexo-'.length);
		if (!UNSTABLE_APPS.includes(app as UnstableApp)) return;
		const m = tag.match(/^pr-(\d+)$/);
		if (!m) return;
		const prNumber = Number(m[1]);

		await withPRLock(prNumber, async () => {
			const state = getPRState(prNumber);
			if (!state) return;
			if (state.images[app as UnstableApp] === 'ready') return;
			state.images[app as UnstableApp] = 'ready';
			setPRState(state);
			try {
				const octokit = await getInstallationOctokit(env);
				if (state.intent[app as UnstableApp]) {
					// Image just landed and the maintainer wants this service up. Two
					// scenarios converge here:
					//   1. They ticked before the image was ready → reconcile would
					//      normally do nothing because intent didn't change, so we pass
					//      `forceApps` to make it dispatch.
					//   2. Same intent across a `pull_request.synchronize` (new commits
					//      arrived) → same handling: force the redeploy onto the new
					//      image.
					await reconcile({
						octokit,
						env,
						prNumber,
						forceApps: [app as UnstableApp]
					});
				} else {
					const body = renderComment({ state, otherPRPins: {} });
					await upsertStickyComment(octokit, env, state, body);
				}
			} catch (e) {
				logger.error('failed to handle image readiness', { prNumber, app, error: String(e) });
			}
		});
	}

	webhooks.on('package.published', async ({ payload }) => {
		const pkg = payload.package;
		const tag = pkg.package_version?.container_metadata?.tag?.name ?? '';
		await onContainerReady(pkg.name, pkg.package_type, pkg.owner?.login ?? '', tag);
	});

	webhooks.on('workflow_run.completed', async ({ payload }) => {
		const path = payload.workflow_run.path ?? '';

		// 1) Production deploy succeeded → reset everyone's intent.
		if (path.endsWith(CI_WORKFLOW_PATH_SUFFIX)) {
			if (payload.workflow_run.name !== 'CI') return;
			if (payload.workflow_run.conclusion !== 'success') return;
			// Only the deploy-production job triggers reset; the run-name on `ci.yml`
			// covers the whole workflow, so we filter by the head ref being `main`.
			if (payload.workflow_run.head_branch !== 'main') return;
			try {
				const octokit = await getInstallationOctokit(env);
				await resetAllAfterDeploy(octokit, env);
			} catch (e) {
				logger.error('failed to reset after deploy', { error: String(e) });
			}
			return;
		}

		// 2) Per-run unstable workflow finished → surface success/failure on the
		// corresponding sticky comment.
		if (!path.endsWith(UNSTABLE_WORKFLOW_PATH_SUFFIX)) return;
		const title = payload.workflow_run.display_title ?? '';
		const m = title.match(/PR #(\d+)/);
		if (!m) return;
		const prNumber = Number(m[1]);
		const conclusion = payload.workflow_run.conclusion;
		const runUrl = payload.workflow_run.html_url;

		await withPRLock(prNumber, async () => {
			const state = getPRState(prNumber);
			if (!state) return;
			if (conclusion !== 'success') {
				try {
					const octokit = await getInstallationOctokit(env);
					// Surface the failure as a notice on the sticky and revert the
					// activity hint so the comment shows untruck → unticked. The
					// next successful reconcile clears the notice.
					state.notice = `Unstable workflow failed: [${title}](${runUrl}). Re-tick to retry.`;
					for (const app of UNSTABLE_APPS) delete state.activity[app];
					setPRState(state);
					const body = renderComment({ state, otherPRPins: {} });
					await upsertStickyComment(octokit, env, state, body);
				} catch (e) {
					logger.error('failed to post unstable failure', { prNumber, error: String(e) });
				}
			}
		});
	});

	// Lightweight handler so we don't blow up on unrelated events.
	webhooks.onAny(({ name }) => {
		logger.debug('webhook received', { name });
	});
}
