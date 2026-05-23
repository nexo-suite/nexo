// Octokit wrappers — installation auth, sticky-comment upserts, workflow
// dispatch, image probing, and a one-shot "list every open PR's sticky
// comment" used by the post-deploy reset.

import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { createLogger } from '@nexo/logger';
import { MARKER } from './comment.js';
import { UNSTABLE_APPS, type UnstableApp } from './state.js';

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

// Upsert the sticky comment by marker. Returns the comment ID.
export async function upsertStickyComment(
	octokit: Octokit,
	env: Env,
	prNumber: number,
	body: string
): Promise<number> {
	const existing = await findStickyComment(octokit, env, prNumber);
	if (existing) {
		await octokit.issues.updateComment({
			owner: env.owner,
			repo: env.repo,
			comment_id: existing,
			body
		});
		return existing;
	}
	const { data } = await octokit.issues.createComment({
		owner: env.owner,
		repo: env.repo,
		issue_number: prNumber,
		body
	});
	return data.id;
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

export async function postReply(
	octokit: Octokit,
	env: Env,
	prNumber: number,
	body: string
): Promise<void> {
	await octokit.issues.createComment({
		owner: env.owner,
		repo: env.repo,
		issue_number: prNumber,
		body
	});
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

export async function getPRHeadSha(octokit: Octokit, env: Env, prNumber: number): Promise<string> {
	const { data } = await octokit.pulls.get({
		owner: env.owner,
		repo: env.repo,
		pull_number: prNumber
	});
	return data.head.sha;
}
