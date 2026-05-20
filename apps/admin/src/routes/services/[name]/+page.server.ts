import { dockerGet, dockerAction, fetchHealthz, fetchContainerStats } from '$lib/server/docker';
import type { ContainerInspect, HealthzResult, ContainerStats } from '$lib/server/docker';
import { error, fail } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import { requireOwner } from '$lib/server/auth';
import { recordHealth } from '$lib/server/health-poller';
import { db, healthCheckRun } from '@nexo/db';
import { and, eq, gte, asc } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const container = await dockerGet<ContainerInspect>(
		`/containers/${encodeURIComponent(params.name)}/json`
	).catch((e) => {
		logger.error('docker inspect failed', { name: params.name, error: String(e) });
		return null;
	});

	if (!container)
		error(404, { message: 'Not found', code: 'NOT_FOUND', correlationId: locals.correlationId });

	let healthz: HealthzResult | null = null;
	let stats: ContainerStats | null = null;
	if (container.State?.Running) {
		[healthz, stats] = await Promise.all([
			fetchHealthz(container).catch(() => null),
			fetchContainerStats(container.Id).catch(() => null)
		]);
	}

	const target = container.Name?.replace(/^\//, '') ?? params.name;
	const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const history = await db
		.select({
			checkedAt: healthCheckRun.checkedAt,
			ok: healthCheckRun.ok,
			latencyMs: healthCheckRun.latencyMs
		})
		.from(healthCheckRun)
		.where(and(eq(healthCheckRun.target, target), gte(healthCheckRun.checkedAt, since)))
		.orderBy(asc(healthCheckRun.checkedAt))
		.catch(() => []);

	return { container, healthz, stats, history };
};

type Verb = 'start' | 'stop' | 'restart';
function actionPath(verb: Verb, name: string): string {
	const enc = encodeURIComponent(name);
	if (verb === 'start') return `/containers/${enc}/start`;
	if (verb === 'stop') return `/containers/${enc}/stop?t=10`;
	return `/containers/${enc}/restart?t=10`;
}

export const actions: Actions = {
	start: async ({ params, locals }) => {
		requireOwner(locals);
		try {
			await dockerAction(actionPath('start', params.name));
			logger.info('container start', { name: params.name, correlationId: locals.correlationId });
			return { success: true as const, verb: 'start' as const };
		} catch (e) {
			logger.error('container start failed', {
				name: params.name,
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, {
				error: 'DOCKER_ERROR' as const,
				verb: 'start' as const,
				correlationId: locals.correlationId
			});
		}
	},
	stop: async ({ params, locals }) => {
		requireOwner(locals);
		try {
			await dockerAction(actionPath('stop', params.name));
			logger.info('container stop', { name: params.name, correlationId: locals.correlationId });
			return { success: true as const, verb: 'stop' as const };
		} catch (e) {
			logger.error('container stop failed', {
				name: params.name,
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, {
				error: 'DOCKER_ERROR' as const,
				verb: 'stop' as const,
				correlationId: locals.correlationId
			});
		}
	},
	restart: async ({ params, locals }) => {
		requireOwner(locals);
		try {
			await dockerAction(actionPath('restart', params.name));
			logger.info('container restart', { name: params.name, correlationId: locals.correlationId });
			return { success: true as const, verb: 'restart' as const };
		} catch (e) {
			logger.error('container restart failed', {
				name: params.name,
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, {
				error: 'DOCKER_ERROR' as const,
				verb: 'restart' as const,
				correlationId: locals.correlationId
			});
		}
	},
	recheck: async ({ params, locals }) => {
		const container = await dockerGet<ContainerInspect>(
			`/containers/${encodeURIComponent(params.name)}/json`
		).catch(() => null);
		if (!container) {
			return fail(404, {
				error: 'NOT_FOUND' as const,
				verb: 'recheck' as const,
				correlationId: locals.correlationId
			});
		}
		const healthz = await fetchHealthz(container);
		const target = container.Name?.replace(/^\//, '') ?? params.name;
		await recordHealth({
			target,
			ok: healthz.ok,
			latencyMs: healthz.latency_ms,
			error: healthz.error,
			source: 'manual'
		}).catch((e) => logger.error('manual health record failed', { target, error: String(e) }));
		logger.info('healthz recheck', {
			name: params.name,
			ok: healthz.ok,
			latency_ms: healthz.latency_ms,
			correlationId: locals.correlationId
		});
		return { success: true as const, verb: 'recheck' as const, healthz };
	}
};
