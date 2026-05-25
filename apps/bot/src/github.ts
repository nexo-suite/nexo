// Octokit wrappers — installation auth, sticky-comment upserts, workflow
// dispatch, image probing, and a one-shot "list every open PR's sticky
// comment" used by the post-deploy reset.

import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { createLogger } from '@nexo/logger';
import { MARKER } from './comment.js';
import { setPRState, UNSTABLE_APPS, type PRState, type UnstableApp } from './state.js';

const logger = createLogger('bot');
const GH_API_VERSION = '2022-11-28';
const UNSTABLE_WORKFLOW = 'unstable.yml';

export type Env = {
	// GitHub App's Client ID string (e.g. `Iv23li…`). Per the @octokit/auth-app
	// README, the `appId` field on createAppAuth accepts either the legacy
	// numeric App ID OR a Client ID string — the Client ID is the recommended
	// value. The separate `clientId` field on createAppAuth is for OAuth
	// user-token features and is unrelated to App JWT authentication.
	clientId: string;
	privateKey: string;
	owner: string;
	repo: string;
};

export async function getInstallationOctokit(env: Env): Promise<Octokit> {
	const appOctokit = new Octokit({
		authStrategy: createAppAuth,
		auth: { appId: env.clientId, privateKey: normalizeKey(env.privateKey) },
		headers: { 'X-GitHub-Api-Version': GH_API_VERSION }
	});

	const { data: installation } = await appOctokit.apps.getRepoInstallation({
		owner: env.owner,
		repo: env.repo
	});

	const auth = createAppAuth({
		appId: env.clientId,
		privateKey: normalizeKey(env.privateKey),
		installationId: installation.id
	});

	const { token } = await auth({ type: 'installation' });
	return new Octokit({ auth: token, headers: { 'X-GitHub-Api-Version': GH_API_VERSION } });
}

function normalizeKey(raw: string): string {
	return raw.replace(/\\n/g, '\n');
}

// Upsert the sticky comment.
//
// Dedup contract: callers pass the full PRState; we compare `body` against
// `state.lastBody` and short-circuit when they match (no API call, no
// `updated_at` bump, no `issue_comment.edited` echo). On every successful
// PATCH/POST we mutate `state.commentId` + `state.lastBody` and `setPRState`
// so the cache survives restarts.
//
// Lookup order when we *do* hit the API:
//   1. `state.commentId` (set on previous upsert) — direct `updateComment`,
//      no list scan. Hot path.
//   2. Fallback to `findStickyComment` (marker scan over the first 100
//      comments) for cold-start or out-of-band deletion.
export async function upsertStickyComment(
	octokit: Octokit,
	env: Env,
	state: PRState,
	body: string
): Promise<void> {
	if (state.lastBody === body && state.commentId > 0) return;

	const knownCommentId = state.commentId;
	let resolvedId: number | null = null;

	if (knownCommentId && knownCommentId > 0) {
		try {
			await octokit.issues.updateComment({
				owner: env.owner,
				repo: env.repo,
				comment_id: knownCommentId,
				body
			});
			resolvedId = knownCommentId;
		} catch (err) {
			if (!isNotFound(err)) throw err;
			// Comment was deleted out of band — fall through to scan + recreate.
			logger.info('known sticky comment id missing, will rescan', {
				prNumber: state.prNumber,
				knownCommentId
			});
		}
	}

	if (resolvedId === null) {
		const existing = await findStickyComment(octokit, env, state.prNumber);
		if (existing) {
			await octokit.issues.updateComment({
				owner: env.owner,
				repo: env.repo,
				comment_id: existing,
				body
			});
			resolvedId = existing;
		} else {
			const { data } = await octokit.issues.createComment({
				owner: env.owner,
				repo: env.repo,
				issue_number: state.prNumber,
				body
			});
			resolvedId = data.id;
		}
	}

	state.commentId = resolvedId;
	state.lastBody = body;
	setPRState(state);
}

function isNotFound(err: unknown): boolean {
	return typeof err === 'object' && err !== null && (err as { status?: number }).status === 404;
}

async function findStickyComment(
	octokit: Octokit,
	env: Env,
	prNumber: number
): Promise<number | null> {
	const marker = MARKER(prNumber);
	const { data } = await octokit.issues.listComments({
		owner: env.owner,
		repo: env.repo,
		issue_number: prNumber,
		per_page: 100
	});
	const found = data.find((c) => c.body?.includes(marker));
	return found ? found.id : null;
}

export async function dispatchUnstable(
	octokit: Octokit,
	env: Env,
	action: 'up' | 'down' | 'down-all-for-pr' | 'down-all',
	args: { service?: UnstableApp; prNumber?: number }
): Promise<void> {
	await octokit.actions.createWorkflowDispatch({
		owner: env.owner,
		repo: env.repo,
		workflow_id: UNSTABLE_WORKFLOW,
		ref: 'main',
		inputs: {
			action,
			service: args.service ?? '',
			pr_number: args.prNumber != null ? String(args.prNumber) : ''
		}
	});
	logger.info('dispatched unstable workflow', { action, ...args });
}

export async function probeImageReadiness(
	octokit: Octokit,
	env: Env,
	prNumber: number
): Promise<Record<UnstableApp, boolean>> {
	const tag = `pr-${prNumber}`;
	const out = {} as Record<UnstableApp, boolean>;
	await Promise.all(
		UNSTABLE_APPS.map(async (app) => {
			out[app] = false;
			try {
				const { data } = await octokit.request(
					'GET /orgs/{org}/packages/container/{pkg}/versions',
					{ org: env.owner, pkg: `nexo-${app}`, per_page: 100 }
				);
				const versions = data as Array<{ metadata?: { container?: { tags?: string[] } } }>;
				if (versions.some((v) => v.metadata?.container?.tags?.includes(tag))) out[app] = true;
			} catch (e) {
				logger.warn('image probe failed', { app, prNumber, error: String(e) });
			}
		})
	);
	return out;
}
