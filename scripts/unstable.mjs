#!/usr/bin/env node
//
// Unstable instance orchestrator. Invoked over SSH on the VPS by the
// unstable.yml workflow (or directly by deploy.mjs for the post-release
// `down-all` sweep). Manages the `_unstable` peer services and the
// VPS-local `.env.unstable` file that pins each service to a `:pr-<n>`
// image tag.
//
// Actions:
//   up <service> <pr>          — pull + start <service>_unstable on :pr-<n>
//   down <service> <pr>        — stop + remove <service>_unstable
//   down-all-for-pr <pr>       — same as `down` for every service currently
//                                pinned to :pr-<n>
//   down-all                   — stop every _unstable container, truncate
//                                .env.unstable. Called after a successful
//                                production release deploy.
//
// `.env.unstable` lives at /home/deploy/nexo/.env.unstable (gitignored,
// bot-managed). One line per pinned service:
//   FINANCE_UNSTABLE_TAG=pr-123
//   AUTH_UNSTABLE_TAG=pr-127

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const ENV_FILE = '.env.unstable';

const UNSTABLE_APPS = new Set(['auth', 'admin', 'finance', 'flaschen', 'calorie', 'landing']);

const [, , action, ...rest] = process.argv;

main().catch((err) => {
	console.error(`✗ ${err.message ?? err}`);
	process.exit(1);
});

async function main() {
	ensureEnvFile();

	switch (action) {
		case 'up': {
			const [service, pr] = rest;
			assertService(service);
			assertPr(pr);
			up(service, pr);
			break;
		}
		case 'down': {
			const [service, pr] = rest;
			assertService(service);
			// pr is informational here (kept for symmetry / logging); we don't
			// gate on it because a "down" from any source should remove the
			// container regardless of which PR last brought it up.
			down(service);
			if (pr) console.log(`(was pinned to ${pr})`);
			break;
		}
		case 'down-all-for-pr': {
			const [pr] = rest;
			assertPr(pr);
			downAllForPr(pr);
			break;
		}
		case 'down-all': {
			downAll();
			break;
		}
		default:
			throw new Error(`unknown action: ${action ?? '(none)'}`);
	}
}

function up(service, pr) {
	const tag = `pr-${pr}`;
	const previous = readEnv()[envKey(service)] ?? null;

	console.log(`📌 Pinning ${service}_unstable to ${tag}`);
	writeEnv({ ...readEnv(), [envKey(service)]: tag });

	console.log(`⬇️  Pulling ${service}_unstable`);
	compose(['--profile', 'unstable', 'pull', `${service}_unstable`]);

	console.log(`🚀 Starting ${service}_unstable`);
	compose(['--profile', 'unstable', 'up', '-d', `${service}_unstable`]);

	console.log('⏳ Waiting 15s for healthcheck');
	sleepSync(15_000);

	const healthy = healthcheckContainer(`${service}_unstable`);
	if (!healthy) {
		console.error('🚨 Healthcheck failed — tearing down and reverting pin');
		compose(['--profile', 'unstable', 'rm', '-sf', `${service}_unstable`]);
		const env = readEnv();
		if (previous === null) delete env[envKey(service)];
		else env[envKey(service)] = previous;
		writeEnv(env);
		throw new Error(`${service}_unstable failed healthcheck`);
	}
	console.log(`✅ ${service}_unstable up on ${tag}`);
}

function down(service) {
	console.log(`🛑 Stopping ${service}_unstable`);
	composeBest(['--profile', 'unstable', 'rm', '-sf', `${service}_unstable`]);
	const env = readEnv();
	if (envKey(service) in env) {
		delete env[envKey(service)];
		writeEnv(env);
	}
	console.log(`✅ ${service}_unstable down`);
}

function downAllForPr(pr) {
	const tag = `pr-${pr}`;
	const env = readEnv();
	const services = [];
	for (const [key, value] of Object.entries(env)) {
		if (value !== tag) continue;
		const service = serviceFromKey(key);
		if (service) services.push(service);
	}
	if (!services.length) {
		console.log(`(no unstable containers pinned to ${tag})`);
		return;
	}
	console.log(
		`🛑 Tearing down ${services.length} container(s) pinned to ${tag}: ${services.join(', ')}`
	);
	for (const service of services) down(service);
}

function downAll() {
	console.log('🧹 Stopping every _unstable container');
	composeBest(['--profile', 'unstable', 'down', '--remove-orphans']);
	writeFileSync(ENV_FILE, '');
	console.log('✅ All unstable instances cleared');
}

function healthcheckContainer(container) {
	// Use the container's own healthcheck status. Compose `ps` with the
	// status filter avoids needing to know which port the container exposes.
	const result = run('docker', ['inspect', '--format={{.State.Health.Status}}', container], {
		silent: true
	});
	if (result.status !== 0) {
		console.error(`docker inspect ${container} failed`);
		return false;
	}
	const status = (result.stdout ?? '').trim();
	console.log(`Health status: ${status}`);
	return status === 'healthy' || status === 'starting'; // starting is acceptable for slow-booting apps
}

// ── env-file helpers ───────────────────────────────────────────────────────

function ensureEnvFile() {
	if (!existsSync(ENV_FILE)) writeFileSync(ENV_FILE, '');
}

function readEnv() {
	const text = readFileSync(ENV_FILE, 'utf8');
	const out = {};
	for (const line of text.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
	}
	return out;
}

function writeEnv(env) {
	const lines = Object.entries(env)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${k}=${v}`);
	writeFileSync(ENV_FILE, lines.length ? lines.join('\n') + '\n' : '');
}

function envKey(service) {
	return `${service.toUpperCase()}_UNSTABLE_TAG`;
}

function serviceFromKey(key) {
	const match = /^([A-Z]+)_UNSTABLE_TAG$/.exec(key);
	if (!match) return null;
	const service = match[1].toLowerCase();
	return UNSTABLE_APPS.has(service) ? service : null;
}

// ── compose helpers ────────────────────────────────────────────────────────

function compose(args) {
	run(
		'docker',
		['compose', '-f', 'docker-compose.yml', '--env-file', '.env', '--env-file', ENV_FILE, ...args],
		{
			throwOnError: true
		}
	);
}

function composeBest(args) {
	run(
		'docker',
		['compose', '-f', 'docker-compose.yml', '--env-file', '.env', '--env-file', ENV_FILE, ...args],
		{
			throwOnError: false
		}
	);
}

function run(cmd, args, opts = {}) {
	const result = spawnSync(cmd, args, {
		stdio: opts.silent ? 'pipe' : 'inherit',
		env: process.env,
		encoding: 'utf8'
	});
	if (opts.throwOnError && result.status !== 0) {
		throw new Error(`${cmd} ${args.join(' ')} exited with status ${result.status}`);
	}
	return result;
}

function sleepSync(ms) {
	const end = Date.now() + ms;
	while (Date.now() < end) {
		spawnSync('sleep', ['0.1']);
	}
}

// ── validation ─────────────────────────────────────────────────────────────

function assertService(service) {
	if (!UNSTABLE_APPS.has(service)) {
		throw new Error(
			`unknown service "${service}"; expected one of: ${[...UNSTABLE_APPS].join(', ')}`
		);
	}
}

function assertPr(pr) {
	if (!/^\d+$/.test(pr)) throw new Error(`invalid pr number "${pr}"`);
}
