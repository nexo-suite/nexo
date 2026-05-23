// Webhook event handlers. The thin layer between Octokit's payload shape
// and the reconciler. Every mutation goes through `withPRLock` so checkbox
// toggles for the same PR can't race each other, and every mutation goes
// through `isMaintainer` first so non-maintainers can't drive the bot.

import type { Webhooks } from '@octokit/webhooks';
import { createLogger } from '@nexo/logger';
import { extractPRFromMarker, parseIntent } from './comment.js';
import { parseCommand } from './commands.js';
import {
	getInstallationOctokit,
	getPRHeadSha,
	postReply,
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
import {
	ensurePRState,
	onPRClosed,
	reconcile,
	resetAllAfterDeploy,
	tearDownPR
} from './reconcile.js';
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
				const commentId = await upsertStickyComment(octokit, env, prNumber, body);
				state.commentId = commentId;
				setPRState(state);
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
			// readiness to pending and let registry_package re-flip them.
			state.images = freshImages();
			setPRState(state);
			try {
				const octokit = await getInstallationOctokit(env);
				const body = renderComment({ state, otherPRPins: {} });
				await upsertStickyComment(octokit, env, prNumber, body);
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
		const body = payload.comment.body ?? '';
		const prNumber = extractPRFromMarker(body);
		if (!prNumber) return;
		const sender = payload.sender.login;

		await withPRLock(prNumber, async () => {
			try {
				const octokit = await getInstallationOctokit(env);
				if (!(await isMaintainer(octokit, env.owner, env.repo, sender))) {
					await postReply(
						octokit,
						env,
						prNumber,
						`@${sender} this command is restricted to repo maintainers.`
					);
					// Re-render to revert any unauthorized checkbox flip.
					const state = getPRState(prNumber);
					if (state) {
						const reverted = renderComment({ state, otherPRPins: {} });
						await upsertStickyComment(octokit, env, prNumber, reverted);
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

	webhooks.on('issue_comment.created', async ({ payload }) => {
		// PRs surface as issues for the comment API; ignore non-PR issues.
		if (!payload.issue.pull_request) return;
		const cmd = parseCommand(payload.comment.body ?? '');
		if (!cmd) return;
		const prNumber = payload.issue.number;
		const sender = payload.sender.login;

		await withPRLock(prNumber, async () => {
			try {
				const octokit = await getInstallationOctokit(env);
				if (!(await isMaintainer(octokit, env.owner, env.repo, sender))) {
					await postReply(
						octokit,
						env,
						prNumber,
						`@${sender} this command is restricted to repo maintainers.`
					);
					return;
				}
				ensurePRState(prNumber, {
					commentId: 0,
					headSha: await getPRHeadSha(octokit, env, prNumber),
					images: freshImages(),
					intent: freshIntent(),
					activity: {}
				});

				if (cmd.kind === 'status') {
					const state = getPRState(prNumber)!;
					const body = renderComment({ state, otherPRPins: {} });
					await upsertStickyComment(octokit, env, prNumber, body);
					return;
				}

				if (cmd.kind === 'down-all') {
					await tearDownPR(octokit, env, prNumber, { dispatch: true });
					return;
				}

				await reconcile({
					octokit,
					env,
					prNumber,
					intentOverride: { [cmd.app]: cmd.kind === 'up' } as Record<UnstableApp, boolean>
				});
			} catch (e) {
				logger.error('failed to handle slash command', { prNumber, error: String(e) });
			}
		});
	});

	webhooks.on('registry_package.published', async ({ payload }) => {
		const pkg = (
			payload as unknown as {
				registry_package?: {
					name?: string;
					package_type?: string;
					owner?: { login?: string };
					package_version?: { container_metadata?: { tag?: { name?: string } } };
				};
			}
		).registry_package;
		if (!pkg) return;
		if (pkg.package_type !== 'container') return;
		if (pkg.owner?.login?.toLowerCase() !== env.owner.toLowerCase()) return;

		const pkgName = pkg.name ?? '';
		const tag = pkg.package_version?.container_metadata?.tag?.name ?? '';
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
				// If the maintainer ticked the box before the image was ready, the
				// reconciler held off on dispatching. Now that the image is ready,
				// re-reconcile to actually bring it up.
				if (state.intent[app as UnstableApp]) {
					await reconcile({ octokit, env, prNumber });
				} else {
					const body = renderComment({ state, otherPRPins: {} });
					await upsertStickyComment(octokit, env, prNumber, body);
				}
			} catch (e) {
				logger.error('failed to handle image readiness', { prNumber, app, error: String(e) });
			}
		});
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
					await postReply(
						octokit,
						env,
						prNumber,
						`❌ Unstable workflow failed: [${title}](${runUrl}). Reverting intent — re-tick to retry.`
					);
					// Failed up/down → revert the activity hint; reconciler will
					// untick on next render based on actual intent.
					for (const app of UNSTABLE_APPS) delete state.activity[app];
					setPRState(state);
					const body = renderComment({ state, otherPRPins: {} });
					await upsertStickyComment(octokit, env, prNumber, body);
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
