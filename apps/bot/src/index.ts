import { createNodeMiddleware, Webhooks } from '@octokit/webhooks';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createLogger } from '@nexo/logger';
import {
	deployedComment,
	deployingComment,
	failedComment,
	idleComment,
	MARKER,
	staleComment,
	timedOutComment,
	waitingComment
} from './comments.js';
import {
	PREVIEW_APPS,
	allReady,
	deleteState,
	findDeployingByRunId,
	freshImages,
	getState,
	missingApps,
	setState,
	type PreviewApp,
	type PRState
} from './state.js';

const logger = createLogger('bot');
const GH_API_VERSION = '2022-11-28';
const PREVIEW_WORKFLOW = 'deploy-preview.yml';
const WAIT_TIMEOUT_MS = 15 * 60 * 1000;
const APP_NAMES = new Set<string>(PREVIEW_APPS);

const {
	GH_APP_ID,
	GH_APP_PRIVATE_KEY,
	GH_WEBHOOK_SECRET,
	GH_REPO_OWNER,
	GH_REPO_NAME,
	PORT = '3003'
} = process.env;

if (!GH_APP_ID || !GH_APP_PRIVATE_KEY || !GH_WEBHOOK_SECRET || !GH_REPO_OWNER || !GH_REPO_NAME) {
	logger.error('missing required env vars');
	process.exit(1);
}

// ── Octokit ────────────────────────────────────────────────────────────────

function makeOctokit(token: string): Octokit {
	return new Octokit({ auth: token, headers: { 'X-GitHub-Api-Version': GH_API_VERSION } });
}

async function getInstallationOctokit(): Promise<Octokit> {
	const appOctokit = new Octokit({
		authStrategy: createAppAuth,
		auth: {
			appId: Number(GH_APP_ID),
			privateKey: GH_APP_PRIVATE_KEY!.replace(/\\n/g, '\n')
		},
		headers: { 'X-GitHub-Api-Version': GH_API_VERSION }
	});

	const { data: installation } = await appOctokit.apps.getRepoInstallation({
		owner: GH_REPO_OWNER!,
		repo: GH_REPO_NAME!
	});

	const auth = createAppAuth({
		appId: Number(GH_APP_ID),
		privateKey: GH_APP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
		installationId: installation.id
	});

	const { token } = await auth({ type: 'installation' });
	return makeOctokit(token);
}

// ── GitHub helpers ─────────────────────────────────────────────────────────

async function updateComment(commentId: number, body: string): Promise<void> {
	try {
		const octokit = await getInstallationOctokit();
		await octokit.issues.updateComment({
			owner: GH_REPO_OWNER!,
			repo: GH_REPO_NAME!,
			comment_id: commentId,
			body
		});
	} catch (e) {
		logger.error('failed to update comment', { commentId, error: String(e) });
	}
}

async function findExistingComment(prNumber: number): Promise<{ id: number } | null> {
	const octokit = await getInstallationOctokit();
	const marker = MARKER(prNumber);
	const { data: comments } = await octokit.issues.listComments({
		owner: GH_REPO_OWNER!,
		repo: GH_REPO_NAME!,
		issue_number: prNumber,
		per_page: 100
	});
	const found = comments.find((c) => c.body?.includes(marker));
	return found ? { id: found.id } : null;
}

// Look up which :pr-<num> tags are already on GHCR — handles late checkbox ticks
// where CI finished before the user said "deploy."
async function probeExistingImages(prNumber: number): Promise<Set<PreviewApp>> {
	const ready = new Set<PreviewApp>();
	const tag = `pr-${prNumber}`;
	const octokit = await getInstallationOctokit();
	await Promise.all(
		PREVIEW_APPS.map(async (app) => {
			try {
				const { data } = await octokit.request(
					'GET /orgs/{org}/packages/container/{pkg}/versions',
					{ org: GH_REPO_OWNER!, pkg: `nexo-${app}`, per_page: 100 }
				);
				const versions = data as Array<{ metadata?: { container?: { tags?: string[] } } }>;
				if (versions.some((v) => v.metadata?.container?.tags?.includes(tag))) {
					ready.add(app);
				}
			} catch (e) {
				logger.warn('image probe failed', { app, prNumber, error: String(e) });
			}
		})
	);
	return ready;
}

// createWorkflowDispatch returns 204 — no run ID. Poll list endpoint to match
// our dispatch by display_title (set via `run-name:` in deploy-preview.yml).
async function dispatchDeploy(prNumber: number, sha: string): Promise<number | null> {
	const octokit = await getInstallationOctokit();
	const dispatchedAt = Date.now();
	await octokit.actions.createWorkflowDispatch({
		owner: GH_REPO_OWNER!,
		repo: GH_REPO_NAME!,
		workflow_id: PREVIEW_WORKFLOW,
		ref: 'main',
		inputs: { pr_number: String(prNumber), sha }
	});
	logger.info('dispatched deploy-preview', { prNumber, sha });

	const marker = `PR #${prNumber}`;
	for (let i = 0; i < 20; i++) {
		await new Promise((r) => setTimeout(r, 1500));
		const { data } = await octokit.actions.listWorkflowRuns({
			owner: GH_REPO_OWNER!,
			repo: GH_REPO_NAME!,
			workflow_id: PREVIEW_WORKFLOW,
			event: 'workflow_dispatch',
			per_page: 10
		});
		const run = data.workflow_runs.find(
			(r) =>
				new Date(r.created_at).getTime() >= dispatchedAt - 5_000 &&
				(r.display_title ?? '').includes(marker)
		);
		if (run) {
			logger.info('matched workflow run', { prNumber, runId: run.id });
			return run.id;
		}
	}
	logger.warn('could not match workflow run', { prNumber });
	return null;
}

// ── State transitions ──────────────────────────────────────────────────────

const tickGuard = new Set<number>();
const dispatchGuard = new Set<number>();

async function startDeployment(prNumber: number, sha: string, commentId: number): Promise<void> {
	const images = freshImages();
	const alreadyPushed = await probeExistingImages(prNumber);
	for (const app of alreadyPushed) images[app] = 'ready';

	setState(prNumber, { status: 'waiting', sha, commentId, images });
	await updateComment(commentId, waitingComment(prNumber, sha, images));

	if (allReady(images)) {
		await transitionToDeploying(prNumber);
	} else {
		setTimeout(() => waitTimeout(prNumber, sha), WAIT_TIMEOUT_MS);
	}
}

async function transitionToDeploying(prNumber: number): Promise<void> {
	if (dispatchGuard.has(prNumber)) return;
	dispatchGuard.add(prNumber);
	try {
		const s = getState(prNumber);
		if (!s || s.status !== 'waiting') return;

		setState(prNumber, { ...s, status: 'deploying', dispatchedAt: Date.now() });
		await updateComment(s.commentId, deployingComment(prNumber, s.sha, s.images));

		const runId = await dispatchDeploy(prNumber, s.sha);
		const cur = getState(prNumber);
		if (cur && runId) setState(prNumber, { ...cur, workflowRunId: runId });
	} finally {
		dispatchGuard.delete(prNumber);
	}
}

async function waitTimeout(prNumber: number, expectedSha: string): Promise<void> {
	const s = getState(prNumber);
	if (!s || s.status !== 'waiting' || s.sha !== expectedSha) return;
	const missing = missingApps(s.images);
	setState(prNumber, { ...s, status: 'failed' });
	await updateComment(s.commentId, timedOutComment(prNumber, s.sha, missing));
	logger.warn('preview wait timed out', { prNumber, missing });
}

async function finalize(
	prNumber: number,
	s: PRState,
	conclusion: string | null,
	runUrl: string
): Promise<void> {
	if (conclusion === 'success') {
		setState(prNumber, { ...s, status: 'deployed' });
		await updateComment(s.commentId, deployedComment(prNumber, s.sha));
		logger.info('preview deployed', { prNumber, sha: s.sha });
	} else {
		setState(prNumber, { ...s, status: 'failed' });
		await updateComment(s.commentId, failedComment(prNumber, s.sha, runUrl));
		logger.warn('preview deploy failed', { prNumber, conclusion });
	}
}

// ── Webhooks ───────────────────────────────────────────────────────────────

const webhooks = new Webhooks({ secret: GH_WEBHOOK_SECRET! });

webhooks.on(['pull_request.opened', 'pull_request.reopened'], async ({ payload }) => {
	const prNumber = payload.pull_request.number;
	logger.info('pr event', { event: payload.action, prNumber });
	try {
		const existing = await findExistingComment(prNumber);
		if (existing) return;
		const octokit = await getInstallationOctokit();
		await octokit.issues.createComment({
			owner: GH_REPO_OWNER!,
			repo: GH_REPO_NAME!,
			issue_number: prNumber,
			body: idleComment(prNumber)
		});
	} catch (e) {
		logger.error('failed to create idle comment', { prNumber, error: String(e) });
	}
});

webhooks.on('pull_request.synchronize', async ({ payload }) => {
	const prNumber = payload.pull_request.number;
	const newSha = payload.pull_request.head.sha;

	const s = getState(prNumber);
	if (!s) return;
	if (s.status === 'waiting' || s.status === 'deploying') return;
	if (s.status !== 'deployed') return;

	setState(prNumber, { ...s, status: 'stale' });
	await updateComment(s.commentId, staleComment(prNumber, s.sha, newSha));
	logger.info('marked stale', { prNumber });
});

webhooks.on('pull_request.closed', ({ payload }) => {
	deleteState(payload.pull_request.number);
});

webhooks.on('issue_comment.edited', async ({ payload }) => {
	const body = payload.comment.body ?? '';
	const m = body.match(/<!-- nexo-preview pr:(\d+) -->/);
	if (!m) return;
	const prNumber = Number(m[1]);
	const checked = body.includes('[x] ') || body.includes('[X] ');
	if (!checked) return;

	if (tickGuard.has(prNumber)) return;
	tickGuard.add(prNumber);
	try {
		const s = getState(prNumber);
		if (s?.status === 'waiting' || s?.status === 'deploying') {
			logger.info('deploy in progress, ignoring tick', { prNumber, status: s.status });
			return;
		}

		const octokit = await getInstallationOctokit();
		const { data: pr } = await octokit.pulls.get({
			owner: GH_REPO_OWNER!,
			repo: GH_REPO_NAME!,
			pull_number: prNumber
		});
		await startDeployment(prNumber, pr.head.sha, payload.comment.id);
	} catch (e) {
		logger.error('failed to start deployment', { prNumber, error: String(e) });
	} finally {
		tickGuard.delete(prNumber);
	}
});

webhooks.on('registry_package.published', async ({ payload }) => {
	// @octokit/webhooks types for registry_package are loose; navigate carefully.
	const pkg = (
		payload as unknown as {
			registry_package?: {
				name?: string;
				package_type?: string;
				owner?: { login?: string };
				package_version?: {
					container_metadata?: { tag?: { name?: string } };
				};
			};
		}
	).registry_package;
	if (!pkg) return;
	if (pkg.package_type !== 'container') return;
	if (pkg.owner?.login?.toLowerCase() !== GH_REPO_OWNER!.toLowerCase()) return;

	const pkgName = pkg.name ?? '';
	const tag = pkg.package_version?.container_metadata?.tag?.name ?? '';
	if (!pkgName.startsWith('nexo-')) return;

	const app = pkgName.slice('nexo-'.length);
	if (!APP_NAMES.has(app)) return;
	const tagMatch = tag.match(/^pr-(\d+)$/);
	if (!tagMatch) return;
	const prNumber = Number(tagMatch[1]);

	const s = getState(prNumber);
	if (!s || s.status !== 'waiting') return;
	if (s.images[app as PreviewApp] === 'ready') return;

	const next: PRState = {
		...s,
		images: { ...s.images, [app as PreviewApp]: 'ready' as const }
	};
	setState(prNumber, next);
	logger.info('image ready', { prNumber, app });

	await updateComment(s.commentId, waitingComment(prNumber, s.sha, next.images));

	if (allReady(next.images)) {
		await transitionToDeploying(prNumber);
	}
});

webhooks.on('workflow_run.completed', async ({ payload }) => {
	if (!payload.workflow_run.path?.endsWith(`/${PREVIEW_WORKFLOW}`)) return;

	const runId = payload.workflow_run.id;
	const conclusion = payload.workflow_run.conclusion;
	const runUrl = payload.workflow_run.html_url;

	const match = findDeployingByRunId(runId);
	if (match) {
		await finalize(match.prNumber, match.state, conclusion, runUrl);
		return;
	}

	// Fallback: workflowRunId wasn't captured (slow API on dispatch). Match by
	// PR number embedded in display_title via run-name.
	const titleMatch = (payload.workflow_run.display_title ?? '').match(/PR #(\d+)/);
	if (!titleMatch) return;
	const prNumber = Number(titleMatch[1]);
	const s = getState(prNumber);
	if (!s || s.status !== 'deploying') return;
	await finalize(prNumber, s, conclusion, runUrl);
});

// ── Server ─────────────────────────────────────────────────────────────────

const middleware = createNodeMiddleware(webhooks, { path: '/webhook' });

const BOT_VERSION = (() => {
	try {
		const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
		return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
	} catch {
		return '0.0.0';
	}
})();
const BOT_COMMIT = process.env.GIT_COMMIT ?? process.env.GITHUB_SHA?.slice(0, 7) ?? 'dev';
const BOT_BUILD_TIME = process.env.BUILD_TIME ?? new Date().toISOString();

createServer((req, res) => {
	if (req.url === '/healthz' || req.url === '/health') {
		res.writeHead(200, { 'content-type': 'application/json' }).end(
			JSON.stringify({
				ok: true,
				version: BOT_VERSION,
				commit: BOT_COMMIT,
				buildTime: BOT_BUILD_TIME,
				checks: {},
				latency_ms: 0
			})
		);
		return;
	}
	middleware(req, res);
}).listen(Number(PORT), () => {
	logger.info('bot started', { port: PORT });
});
