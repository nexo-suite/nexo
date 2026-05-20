import { db, healthCheckRun } from '@nexo/db';
import { lt } from 'drizzle-orm';
import { logger } from './logger';
import { dockerGet, fetchHealthz } from './docker';
import type { ContainerInfo, ContainerInspect } from './docker';

const TICK_INTERVAL_MS = Number(process.env.ADMIN_HEALTH_TICK_MS ?? 30_000);
const PRUNE_EVERY_N_TICKS = 60;
const RETENTION_DAYS = 7;
const FAIL_STREAK_FOR_ALERT = 2;

type Source = 'poller' | 'manual' | 'docker';

interface AlertCallbacks {
	onTransitionToFail?: (target: string, error: string | null) => Promise<void> | void;
	onTransitionToOk?: (target: string) => Promise<void> | void;
}

let started = false;
let stopping = false;
let timer: NodeJS.Timeout | null = null;
let ticking = false;
let tickCount = 0;

const failStreaks = new Map<string, number>();
const alertedTargets = new Set<string>();
const alertCallbacks: AlertCallbacks = {};

export function setHealthAlertCallbacks(cb: AlertCallbacks): void {
	alertCallbacks.onTransitionToFail = cb.onTransitionToFail;
	alertCallbacks.onTransitionToOk = cb.onTransitionToOk;
}

export async function recordHealth(opts: {
	target: string;
	ok: boolean;
	latencyMs?: number;
	error?: string;
	source: Source;
}): Promise<void> {
	await db.insert(healthCheckRun).values({
		target: opts.target,
		ok: opts.ok,
		latencyMs: opts.latencyMs ?? null,
		error: opts.error ?? null,
		source: opts.source
	});
}

async function pollContainer(c: ContainerInfo): Promise<void> {
	const target = (c.Names?.[0] ?? c.Id).replace(/^\//, '');
	const inspect = await dockerGet<ContainerInspect>(`/containers/${c.Id}/json`).catch(() => null);
	if (!inspect || !inspect.State?.Running) return;

	const result = await fetchHealthz(inspect, 5_000);
	await recordHealth({
		target,
		ok: result.ok,
		latencyMs: result.latency_ms,
		error: result.error,
		source: 'poller'
	}).catch((e) => logger.error('health record failed', { target, error: String(e) }));

	const prevStreak = failStreaks.get(target) ?? 0;
	if (!result.ok) {
		const next = prevStreak + 1;
		failStreaks.set(target, next);
		if (next >= FAIL_STREAK_FOR_ALERT && !alertedTargets.has(target)) {
			alertedTargets.add(target);
			try {
				await alertCallbacks.onTransitionToFail?.(target, result.error ?? null);
			} catch (e) {
				logger.error('alert onTransitionToFail failed', { target, error: String(e) });
			}
		}
	} else {
		failStreaks.set(target, 0);
		if (alertedTargets.has(target)) {
			alertedTargets.delete(target);
			try {
				await alertCallbacks.onTransitionToOk?.(target);
			} catch (e) {
				logger.error('alert onTransitionToOk failed', { target, error: String(e) });
			}
		}
	}
}

async function tick(): Promise<void> {
	if (stopping || ticking) return;
	ticking = true;
	try {
		const containers = await dockerGet<ContainerInfo[]>(
			`/containers/json?filters=${encodeURIComponent(
				JSON.stringify({ network: ['nexo-production', 'nexo-preview'] })
			)}`
		).catch(() => [] as ContainerInfo[]);

		await Promise.all(containers.map((c) => pollContainer(c).catch(() => {})));

		tickCount += 1;
		if (tickCount % PRUNE_EVERY_N_TICKS === 0) {
			const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
			await db
				.delete(healthCheckRun)
				.where(lt(healthCheckRun.checkedAt, cutoff))
				.catch((e) => logger.error('health prune failed', { error: String(e) }));
		}
	} finally {
		ticking = false;
	}
}

function schedule(): void {
	timer = setTimeout(async () => {
		await tick();
		if (!stopping) schedule();
	}, TICK_INTERVAL_MS);
	timer.unref?.();
}

export function startHealthPoller(): void {
	if (started) return;
	started = true;
	logger.info('health poller starting', { tickIntervalMs: TICK_INTERVAL_MS });
	void tick().then(() => {
		if (!stopping) schedule();
	});

	const stop = (signal: string) => {
		logger.info('health poller stopping', { signal });
		stopping = true;
		if (timer) clearTimeout(timer);
	};
	process.on('SIGTERM', () => stop('SIGTERM'));
	process.on('SIGINT', () => stop('SIGINT'));
}
