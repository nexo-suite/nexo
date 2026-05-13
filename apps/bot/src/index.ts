import { createNodeMiddleware, Webhooks } from '@octokit/webhooks';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { createServer } from 'node:http';
import { createLogger } from '@nexo/logger';

const logger = createLogger('bot');

const GH_API_VERSION = '2022-11-28';
function makeOctokit(token: string): Octokit {
	return new Octokit({ auth: token, headers: { 'X-GitHub-Api-Version': GH_API_VERSION } });
}

const {
	GH_APP_ID,
	GH_APP_PRIVATE_KEY,
	GH_WEBHOOK_SECRET,
	GH_REPO_OWNER,
	GH_REPO_NAME,
	GITHUB_TOKEN, // PAT with actions:write to trigger workflows
	PORT = '3003'
} = process.env;

if (
	!GH_APP_ID ||
	!GH_APP_PRIVATE_KEY ||
	!GH_WEBHOOK_SECRET ||
	!GH_REPO_OWNER ||
	!GH_REPO_NAME ||
	!GITHUB_TOKEN
) {
	logger.error('missing required env vars');
	process.exit(1);
}

// ── In-memory deploy state ────────────────────────────────────────────────────

type DeployStatus = 'deploying' | 'deployed';

const deployState = new Map<number, { sha: string; status: DeployStatus }>();
const creatingCommentForPR = new Set<number>();
const triggeringDeployForPR = new Set<number>();

// ── Comment templates ─────────────────────────────────────────────────────────

const MARKER = (prNumber: number) => `<!-- nexo-preview pr:${prNumber} -->`;

const IDLE_COMMENT = (prNumber: number) =>
	[
		'### Nexo Preview',
		'',
		'**Status:** 💤 Idle — no deployment yet',
		'',
		'- [ ] Deploy to preview environment',
		'',
		MARKER(prNumber)
	].join('\n');

const DEPLOYING_COMMENT = (prNumber: number, sha: string) =>
	[
		'### Nexo Preview',
		'',
		`**Status:** ⏳ Deploying \`${sha.slice(0, 7)}\`…`,
		'',
		'- [x] Deploy to preview environment _(in progress)_',
		'',
		MARKER(prNumber)
	].join('\n');

const STALE_COMMENT = (prNumber: number, liveSha: string, newSha: string) =>
	[
		'### Nexo Preview',
		'',
		`**Status:** ⚠️ Stale — \`${liveSha.slice(0, 7)}\` is live, PR is now at \`${newSha.slice(0, 7)}\``,
		'',
		'- [ ] Deploy latest commit to preview',
		'',
		MARKER(prNumber)
	].join('\n');

// ── Octokit helpers ───────────────────────────────────────────────────────────

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

async function findBotComment(
	octokit: Octokit,
	prNumber: number
): Promise<{ id: number; body: string } | null> {
	const marker = MARKER(prNumber);
	const { data: comments } = await octokit.issues.listComments({
		owner: GH_REPO_OWNER!,
		repo: GH_REPO_NAME!,
		issue_number: prNumber,
		per_page: 100
	});
	const comment = comments.find((c) => c.body?.includes(marker));
	return comment ? { id: comment.id, body: comment.body ?? '' } : null;
}

async function triggerDeploy(prNumber: number, sha: string, commentId: number) {
	deployState.set(prNumber, { sha, status: 'deploying' }); // sync guard before first await
	logger.info('deploy triggered', { prNumber, sha, commentId });

	const octokit = await getInstallationOctokit();

	await octokit.issues.updateComment({
		owner: GH_REPO_OWNER!,
		repo: GH_REPO_NAME!,
		comment_id: commentId,
		body: DEPLOYING_COMMENT(prNumber, sha)
	});

	const patOctokit = makeOctokit(GITHUB_TOKEN!);
	await patOctokit.actions.createWorkflowDispatch({
		owner: GH_REPO_OWNER!,
		repo: GH_REPO_NAME!,
		workflow_id: 'deploy-preview.yml',
		ref: 'main',
		inputs: {
			pr_number: String(prNumber),
			sha,
			comment_id: String(commentId)
		}
	});
	logger.info('workflow dispatch sent', { prNumber, sha });
}

// ── Webhook handlers ──────────────────────────────────────────────────────────

const webhooks = new Webhooks({ secret: GH_WEBHOOK_SECRET! });

webhooks.on(['pull_request.opened', 'pull_request.reopened'], async ({ payload }) => {
	const prNumber = payload.pull_request.number;
	const event = payload.action;
	logger.info('pr event', { event, prNumber });

	if (creatingCommentForPR.has(prNumber)) {
		logger.warn('duplicate pr event skipped', { event, prNumber });
		return;
	}
	creatingCommentForPR.add(prNumber);
	try {
		const octokit = await getInstallationOctokit();
		const existing = await findBotComment(octokit, prNumber);
		if (existing) {
			logger.info('comment already exists, skipping', { prNumber });
			return;
		}
		await octokit.issues.createComment({
			owner: GH_REPO_OWNER!,
			repo: GH_REPO_NAME!,
			issue_number: prNumber,
			body: IDLE_COMMENT(prNumber)
		});
		logger.info('idle comment created', { prNumber });
	} catch (e) {
		logger.error('failed to create idle comment', { prNumber, error: String(e) });
	} finally {
		creatingCommentForPR.delete(prNumber);
	}
});

// When a new commit is pushed, mark comment as stale only if something was deployed
webhooks.on('pull_request.synchronize', async ({ payload }) => {
	const prNumber = payload.pull_request.number;
	const newSha = payload.pull_request.head.sha;
	logger.info('pr synchronize', { prNumber, newSha: newSha.slice(0, 7) });

	const octokit = await getInstallationOctokit();
	const comment = await findBotComment(octokit, prNumber);
	if (!comment) return;

	// Only mark stale if a deployment is live or was deployed (has a SHA in the body)
	const isDeployed = comment.body.includes('✅');
	const isDeploying = comment.body.includes('⏳');
	const state = deployState.get(prNumber);

	if (!isDeployed && !state) {
		logger.info('pr never deployed, skipping stale update', { prNumber });
		return;
	}
	if (isDeploying || state?.status === 'deploying') {
		logger.info('deploy in progress, skipping stale update', { prNumber });
		return;
	}

	// Extract the live SHA from the comment or state
	const shaMatch = comment.body.match(/`([0-9a-f]{7})`/);
	const liveSha = shaMatch ? shaMatch[1] : (state?.sha ?? newSha.slice(0, 7));

	await octokit.issues.updateComment({
		owner: GH_REPO_OWNER!,
		repo: GH_REPO_NAME!,
		comment_id: comment.id,
		body: STALE_COMMENT(prNumber, liveSha, newSha)
	});
	logger.info('comment marked stale', { prNumber, liveSha, newSha: newSha.slice(0, 7) });
});

// Checkbox tick triggers a deploy
webhooks.on('issue_comment.edited', async ({ payload }) => {
	const body = payload.comment.body ?? '';
	const markerMatch = body.match(/<!-- nexo-preview pr:(\d+) -->/);
	if (!markerMatch) return;

	const prNumber = Number(markerMatch[1]);
	const checked = body.includes('[x] ') || body.includes('[X] ');
	logger.info('comment edited', { prNumber, checked });
	if (!checked) return;

	// Synchronous guards before any await
	const state = deployState.get(prNumber);
	if (state?.status === 'deploying') {
		logger.info('deploy already in progress, ignoring checkbox tick', { prNumber });
		return;
	}
	if (triggeringDeployForPR.has(prNumber)) {
		logger.warn('duplicate deploy trigger skipped', { prNumber });
		return;
	}
	triggeringDeployForPR.add(prNumber);

	try {
		const octokit = await getInstallationOctokit();
		const { data: pr } = await octokit.pulls.get({
			owner: GH_REPO_OWNER!,
			repo: GH_REPO_NAME!,
			pull_number: prNumber
		});

		await triggerDeploy(prNumber, pr.head.sha, payload.comment.id);
	} finally {
		triggeringDeployForPR.delete(prNumber);
	}
});

const middleware = createNodeMiddleware(webhooks, { path: '/webhook' });

createServer((req, res) => {
	if (req.url === '/health') {
		res.writeHead(200).end('ok');
		return;
	}
	middleware(req, res);
}).listen(Number(PORT), () => {
	logger.info('bot started', { port: PORT });
});
