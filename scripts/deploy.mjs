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
//   4. Poll Docker per-service health within a 60s budget. Fast-fail if
//      migrate exits non-zero. Roll back if any tracked service hasn't
//      reached its terminal/healthy state by the deadline.
//   5. Final external curl probe against public hostnames (Caddy/TLS sanity)
//   6. Tear down all unstable instances; bot resets sticky comments
//
// Reads from environment (set via appleboy/ssh-action `envs:`):
//   APP_VERSION_AUTH, APP_VERSION_ADMIN, APP_VERSION_FINANCE,
//   APP_VERSION_FLASCHEN, APP_VERSION_CALORIE, APP_VERSION_LANDING,
//   APP_VERSION_BOT, APP_COMMIT, APP_BUILD_TIME

import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';

const REGISTRY = 'ghcr.io/nexo-suite';
const PROD_SERVICES = [
	'nexo-auth',
	'nexo-admin',
	'nexo-finance',
	'nexo-flaschen',
	'nexo-calorie',
	'nexo-landing',
	'nexo-bot',
	'nexo-db'
];

// Per-service health budget. `kind: 'oneshot'` succeeds on exit 0; `kind:
// 'longrun'` succeeds when running and either healthy (if a healthcheck is
// defined) or simply running (if not). Names match `docker compose` service
// names (not container names — compose adds a -1 suffix in production).
const TRACKED = [
	{ service: 'migrate', kind: 'oneshot', critical: true },
	{ service: 'postgres', kind: 'longrun', critical: true },
	{ service: 'pgbouncer', kind: 'longrun', critical: true },
	{ service: 'auth', kind: 'longrun', critical: true },
	{ service: 'admin', kind: 'longrun', critical: true },
	{ service: 'finance', kind: 'longrun', critical: true },
	{ service: 'flaschen', kind: 'longrun', critical: true },
	{ service: 'calorie', kind: 'longrun', critical: true },
	{ service: 'landing', kind: 'longrun', critical: true },
	{ service: 'flaschen-worker', kind: 'longrun', critical: true },
	{ service: 'bot', kind: 'longrun', critical: false },
	{ service: 'caddy', kind: 'longrun', critical: true }
];

const HEALTH_HOSTS = [
	'auth.krieger2501.de',
	'admin.krieger2501.de',
	'finance.krieger2501.de',
	'flaschen.krieger2501.de',
	'calorie.krieger2501.de',
	'krieger2501.de'
];
const HEALTH_BUDGET_SECONDS = 60;
const HEALTH_POLL_INTERVAL_MS = 2000;
const EXTERNAL_TIMEOUT_SECONDS = 10;

// Compose reads --env-file files in order; later wins. .env.unstable is
// bot-managed and may be absent on a fresh VPS — make sure it exists so the
// flag is always safe to pass.
const ENV_FILES = ['--env-file', '.env', '--env-file', '.env.unstable'];
const PROFILE_FLAGS = ['--profile', 'production', '--profile', 'server'];

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
	compose([...PROFILE_FLAGS, ...ENV_FILES, 'pull'], composeEnv);

	console.log('🚀 Starting production stack');
	compose([...PROFILE_FLAGS, ...ENV_FILES, 'up', '-d'], composeEnv);

	console.log('🔁 Reloading Caddy');
	// Caddy may not have changed; failure is non-fatal.
	composeBest(['exec', 'caddy', 'caddy', 'reload', '--config', '/etc/caddy/Caddyfile']);

	console.log(`⏳ Waiting up to ${HEALTH_BUDGET_SECONDS}s for services to report healthy`);
	const result = await waitForServiceHealth();
	if (!result.ok) {
		console.error(`🚨 ${result.reason} — rolling back to :previous images`);
		dumpLogsForFailures(result.failed);
		rollback();
		compose([...PROFILE_FLAGS, ...ENV_FILES, 'up', '-d'], composeEnv);
		composeBest(['exec', 'caddy', 'caddy', 'reload', '--config', '/etc/caddy/Caddyfile']);
		throw new Error('Rollback complete — failing the workflow');
	}

	console.log('🌐 Probing public hostnames (Caddy/TLS sanity)');
	const externalOk = await runExternalHealthchecks();
	if (!externalOk) {
		console.error('🚨 External probe failed — rolling back to :previous images');
		rollback();
		compose([...PROFILE_FLAGS, ...ENV_FILES, 'up', '-d'], composeEnv);
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
		calorie: process.env.APP_VERSION_CALORIE ?? '',
		landing: process.env.APP_VERSION_LANDING ?? ''
	};
	return JSON.stringify(versions);
}

// ── Health polling ───────────────────────────────────────────────────────────

/**
 * Returns one record per compose service: { Service, State, Health, ExitCode }.
 * `docker compose ps --format json` emits NDJSON in v2; we tolerate either
 * shape (ND-JSON or a JSON array) for forward/backward compatibility.
 */
function readComposeStates() {
	const r = run(
		'docker',
		['compose', '-f', 'docker-compose.yml', ...PROFILE_FLAGS, 'ps', '-a', '--format', 'json'],
		{
			silent: true
		}
	);
	if (r.status !== 0 || !r.stdout) return [];
	const text = r.stdout.trim();
	if (!text) return [];
	try {
		// Compose v2: NDJSON
		if (text.startsWith('{')) {
			return text
				.split('\n')
				.filter(Boolean)
				.map((line) => JSON.parse(line));
		}
		// Older shapes / array
		return JSON.parse(text);
	} catch (e) {
		console.warn(`⚠️  failed to parse compose ps output: ${String(e)}`);
		return [];
	}
}

function readinessOf(spec, state) {
	if (!state) return { ready: false, reason: 'missing' };
	const { State, Health, ExitCode } = state;
	if (spec.kind === 'oneshot') {
		if (State === 'exited' && Number(ExitCode) === 0) return { ready: true };
		if (State === 'exited' && Number(ExitCode) !== 0) {
			return { ready: false, reason: `exited(${ExitCode})`, fatal: true };
		}
		return { ready: false, reason: State || 'pending' };
	}
	// longrun
	if (State !== 'running') return { ready: false, reason: State || 'pending' };
	if (!Health) return { ready: true }; // no healthcheck — running is enough
	if (Health === 'healthy') return { ready: true };
	if (Health === 'unhealthy') return { ready: false, reason: 'unhealthy', fatal: true };
	return { ready: false, reason: Health }; // 'starting'
}

async function waitForServiceHealth() {
	const deadline = Date.now() + HEALTH_BUDGET_SECONDS * 1000;
	let lastSummary = '';
	while (Date.now() < deadline) {
		const states = readComposeStates();
		const byService = new Map(states.map((s) => [s.Service, s]));
		const evals = TRACKED.map((spec) => {
			const r = readinessOf(spec, byService.get(spec.service));
			return { ...spec, state: byService.get(spec.service) ?? null, ...r };
		});

		// Fast-fail on any critical fatal state (e.g. migrate exited non-zero,
		// or a long-runner reported unhealthy outright).
		const fatal = evals.find((e) => e.critical && e.fatal);
		if (fatal) {
			return {
				ok: false,
				reason: `${fatal.service} fatal: ${fatal.reason}`,
				failed: evals.filter((e) => !e.ready)
			};
		}

		const allReady = evals.every((e) => e.ready || !e.critical);
		const summary = evals
			.map((e) => `${e.service}=${e.ready ? 'ok' : (e.reason ?? '?')}`)
			.join(' ');
		if (summary !== lastSummary) {
			console.log(`   ${summary}`);
			lastSummary = summary;
		}
		if (allReady) return { ok: true };
		await sleep(HEALTH_POLL_INTERVAL_MS);
	}

	const states = readComposeStates();
	const byService = new Map(states.map((s) => [s.Service, s]));
	const evals = TRACKED.map((spec) => {
		const r = readinessOf(spec, byService.get(spec.service));
		return { ...spec, state: byService.get(spec.service) ?? null, ...r };
	});
	const failed = evals.filter((e) => e.critical && !e.ready);
	if (failed.length === 0) return { ok: true };
	return {
		ok: false,
		reason: `health budget (${HEALTH_BUDGET_SECONDS}s) exceeded`,
		failed
	};
}

function dumpLogsForFailures(failed) {
	for (const f of failed) {
		console.error(`──── ${f.service}: ${f.reason ?? 'not ready'} ────`);
		composeBest([...PROFILE_FLAGS, ...ENV_FILES, 'logs', '--tail', '50', '--no-color', f.service]);
	}
}

async function runExternalHealthchecks() {
	let allHealthy = true;
	for (const host of HEALTH_HOSTS) {
		const result = run(
			'curl',
			['-fsS', '--max-time', String(EXTERNAL_TIMEOUT_SECONDS), `https://${host}/healthz`],
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

// ── Process plumbing ─────────────────────────────────────────────────────────

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
