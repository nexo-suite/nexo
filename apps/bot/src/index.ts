import { createNodeMiddleware, Webhooks } from '@octokit/webhooks';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createLogger } from '@nexo/logger';
import { registerWebhooks } from './webhooks.js';
import { bootstrapImageProbes } from './reconcile.js';
import { getInstallationOctokit, type Env } from './github.js';
import { initStateFromDisk, setOnChange, snapshot } from './state.js';
import { loadStateFromDisk, saveStateToDisk } from './store.js';

const logger = createLogger('bot');

// Rehydrate persistent state before any webhook can land. From this point on,
// every mutation in state.ts triggers a synchronous write through the store.
initStateFromDisk(loadStateFromDisk());
setOnChange(() => saveStateToDisk(snapshot()));

const {
	GH_CLIENT_ID,
	GH_APP_PRIVATE_KEY,
	GH_WEBHOOK_SECRET,
	GH_REPO_OWNER,
	GH_REPO_NAME,
	PORT = '3003'
} = process.env;

if (!GH_CLIENT_ID || !GH_APP_PRIVATE_KEY || !GH_WEBHOOK_SECRET || !GH_REPO_OWNER || !GH_REPO_NAME) {
	logger.error('missing required env vars');
	process.exit(1);
}

const env: Env = {
	clientId: GH_CLIENT_ID!,
	privateKey: GH_APP_PRIVATE_KEY!,
	owner: GH_REPO_OWNER!,
	repo: GH_REPO_NAME!
};

const webhooks = new Webhooks({ secret: GH_WEBHOOK_SECRET! });
registerWebhooks(webhooks, env);

const middleware = createNodeMiddleware(webhooks, { path: '/webhook' });

const BOT_VERSION =
	process.env.APP_VERSION ??
	(() => {
		try {
			const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
			return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
		} catch {
			return '0.0.0';
		}
	})();
const BOT_COMMIT =
	process.env.APP_COMMIT ?? process.env.GIT_COMMIT ?? process.env.GITHUB_SHA?.slice(0, 7) ?? 'dev';
const BOT_BUILD_TIME =
	process.env.APP_BUILD_TIME ?? process.env.BUILD_TIME ?? new Date().toISOString();

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

// Re-probe the registry for every persisted PR so any image-ready events
// that fired while the bot was down get reflected on the sticky. Runs
// fire-and-forget — webhooks are already serving by the time this lands.
void (async () => {
	try {
		const octokit = await getInstallationOctokit(env);
		await bootstrapImageProbes(octokit, env);
	} catch (e) {
		logger.error('bootstrap probe failed', { error: String(e) });
	}
})();
