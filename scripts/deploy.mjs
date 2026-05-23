#!/usr/bin/env node
//
// Production deploy orchestrator. Invoked over SSH on the VPS by the
// CI workflow's deploy-production job. Runs in the deploy directory
// (/home/deploy/nexo) which has already been git-reset to origin/main
// before this script starts.
//
// Steps:
//   1. Snapshot current :latest images as :previous (rollback safety net)
//   2. docker compose pull + up -d for production + server profiles
//   3. Reload Caddy
//   4. Healthcheck-gated rollback: if any /healthz probe fails, restore
//      :previous → :latest and bring the stack back up
//   5. Tear down all unstable instances; bot resets sticky comments
//
// Reads from environment (set via appleboy/ssh-action `envs:`):
//   APP_VERSION_AUTH, APP_VERSION_ADMIN, APP_VERSION_FINANCE,
//   APP_VERSION_FLASCHEN, APP_VERSION_LANDING, APP_VERSION_BOT
//   APP_COMMIT, APP_BUILD_TIME

import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';

const REGISTRY = 'ghcr.io/nexo-suite';
const PROD_SERVICES = [
	'nexo-auth',
	'nexo-admin',
	'nexo-finance',
	'nexo-flaschen',
	'nexo-landing',
	'nexo-bot',
	'nexo-db'
];
const HEALTH_HOSTS = [
	'auth.krieger2501.de',
	'admin.krieger2501.de',
	'finance.krieger2501.de',
	'flaschen.krieger2501.de',
	'krieger2501.de'
];
const HEALTH_WAIT_SECONDS = 30;
const HEALTH_TIMEOUT_SECONDS = 10;

// Compose reads --env-file files in order; later wins. .env.unstable is
// bot-managed and may be absent on a fresh VPS — make sure it exists so the
// flag is always safe to pass.
const ENV_FILES = ['--env-file', '.env', '--env-file', '.env.unstable'];

main().catch((err) => {
	console.error(`✗ ${err.message ?? err}`);
	process.exit(1);
});

async function main() {
	ensureUnstableEnvFile();
	snapshotPreviousImages();

	const versionsJson = buildVersionsJson();
	const composeEnv = { ...process.env, APP_VERSIONS_JSON: versionsJson };

	console.log('⬇️  Pulling production images');
	compose(['--profile', 'production', '--profile', 'server', ...ENV_FILES, 'pull'], composeEnv);

	console.log('🚀 Starting production stack');
	compose(['--profile', 'production', '--profile', 'server', ...ENV_FILES, 'up', '-d'], composeEnv);

	console.log('🔁 Reloading Caddy');
	// Caddy may not have changed; failure is non-fatal.
	composeBest(['exec', 'caddy', 'caddy', 'reload', '--config', '/etc/caddy/Caddyfile']);

	console.log(`⏳ Waiting ${HEALTH_WAIT_SECONDS}s for services to settle`);
	await sleep(HEALTH_WAIT_SECONDS * 1000);

	const allHealthy = await runHealthchecks();
	if (!allHealthy) {
		console.error('🚨 Healthcheck failed — rolling back to :previous images');
		rollback();
		compose(
			['--profile', 'production', '--profile', 'server', ...ENV_FILES, 'up', '-d'],
			composeEnv
		);
		composeBest(['exec', 'caddy', 'caddy', 'reload', '--config', '/etc/caddy/Caddyfile']);
		throw new Error('Rollback complete — failing the workflow');
	}

	console.log('🧹 Tearing down unstable instances');
	// The bot watches for ci.yml deploy-production success and rewrites all
	// open PRs' sticky comments to reflect the cleared state.
	const unstable = run('node', ['scripts/unstable.mjs', 'down-all'], { throwOnError: false });
	if (unstable.status !== 0) {
		console.warn('⚠️  unstable down-all returned non-zero; continuing');
	}

	console.log('✅ Deploy complete');
}

function ensureUnstableEnvFile() {
	if (!existsSync('.env.unstable')) {
		writeFileSync('.env.unstable', '');
	}
}

function snapshotPreviousImages() {
	console.log('📸 Tagging current :latest images as :previous');
	for (const svc of PROD_SERVICES) {
		const latest = `${REGISTRY}/${svc}:latest`;
		const previous = `${REGISTRY}/${svc}:previous`;
		if (run('docker', ['image', 'inspect', latest], { silent: true }).status === 0) {
			run('docker', ['tag', latest, previous]);
		}
	}
}

function rollback() {
	for (const svc of PROD_SERVICES) {
		const previous = `${REGISTRY}/${svc}:previous`;
		const latest = `${REGISTRY}/${svc}:latest`;
		if (run('docker', ['image', 'inspect', previous], { silent: true }).status === 0) {
			run('docker', ['tag', previous, latest]);
		}
	}
}

function buildVersionsJson() {
	const versions = {
		finance: process.env.APP_VERSION_FINANCE ?? '',
		auth: process.env.APP_VERSION_AUTH ?? '',
		admin: process.env.APP_VERSION_ADMIN ?? '',
		flaschen: process.env.APP_VERSION_FLASCHEN ?? '',
		landing: process.env.APP_VERSION_LANDING ?? ''
	};
	return JSON.stringify(versions);
}

async function runHealthchecks() {
	let allHealthy = true;
	for (const host of HEALTH_HOSTS) {
		const result = run(
			'curl',
			['-fsS', '--max-time', String(HEALTH_TIMEOUT_SECONDS), `https://${host}/healthz`],
			{ silent: true }
		);
		if (result.status === 0) {
			console.log(`✅ ${host} healthy`);
		} else {
			console.error(`❌ ${host} healthcheck failed`);
			allHealthy = false;
		}
	}
	return allHealthy;
}

function compose(args, env) {
	run('docker', ['compose', '-f', 'docker-compose.yml', ...args], { env, throwOnError: true });
}

function composeBest(args) {
	run('docker', ['compose', '-f', 'docker-compose.yml', ...args], { throwOnError: false });
}

function run(cmd, args, opts = {}) {
	const result = spawnSync(cmd, args, {
		stdio: opts.silent ? 'pipe' : 'inherit',
		env: opts.env ?? process.env,
		encoding: 'utf8'
	});
	if (opts.throwOnError && result.status !== 0) {
		throw new Error(`${cmd} ${args.join(' ')} exited with status ${result.status}`);
	}
	return result;
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
