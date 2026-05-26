import { db, healthCheckRun } from '@nexo/db';
import { inArray, sql } from 'drizzle-orm';
import { dockerGet } from '$lib/server/docker';
import type { ContainerInfo } from '$lib/server/docker';
import { ctnComposeProfile, ctnHasHealthzLabel } from '$lib/utils/containers';
import type { HealthzSnapshot } from '$lib/utils/containers';
import { devMockEnabled, mockHealthSnapshots } from '$lib/server/dev-mocks';
import { logger } from '$lib/server/logger';
import type { PageServerLoad } from './$types';

export interface EnrichedContainer extends ContainerInfo {
	Profile: 'production' | 'preview' | 'unknown';
	Healthz?: HealthzSnapshot;
}

export const load: PageServerLoad = async ({ locals }) => {
	const rawContainers = await dockerGet<ContainerInfo[]>(
		`/containers/json?all=1&filters=${encodeURIComponent(JSON.stringify({ network: ['nexo-production', 'nexo-preview'] }))}`
	).catch((e) => {
		logger.error('docker list containers failed', {
			error: String(e),
			correlationId: locals.correlationId
		});
		return [] as ContainerInfo[];
	});

	const targetNames = rawContainers
		.filter(ctnHasHealthzLabel)
		.map((c) => (c.Names[0] ?? c.Id).replace(/^\//, ''));

	const latestByTarget = new Map<string, HealthzSnapshot>();
	if (targetNames.length > 0) {
		const rows = await db
			.selectDistinctOn([healthCheckRun.target], {
				target: healthCheckRun.target,
				ok: healthCheckRun.ok,
				checkedAt: healthCheckRun.checkedAt,
				error: healthCheckRun.error,
				latencyMs: healthCheckRun.latencyMs
			})
			.from(healthCheckRun)
			.where(inArray(healthCheckRun.target, targetNames))
			.orderBy(healthCheckRun.target, sql`${healthCheckRun.checkedAt} desc`)
			.catch((e) => {
				logger.error('latest healthz query failed', {
					error: String(e),
					correlationId: locals.correlationId
				});
				return [] as Array<{
					target: string;
					ok: boolean;
					checkedAt: Date;
					error: string | null;
					latencyMs: number | null;
				}>;
			});

		for (const r of rows) {
			latestByTarget.set(r.target, {
				ok: r.ok,
				checkedAt: r.checkedAt,
				error: r.error,
				latencyMs: r.latencyMs
			});
		}
	}

	// Dev fallback: any probed container without a real snapshot gets a mock one
	// so the home page reflects realistic state when Postgres is offline locally.
	if (devMockEnabled()) {
		const mocks = mockHealthSnapshots();
		for (const target of targetNames) {
			if (!latestByTarget.has(target)) {
				const snap = mocks.get(target);
				if (snap) latestByTarget.set(target, snap);
			}
		}
	}

	const containers: EnrichedContainer[] = rawContainers.map((c) => {
		const target = (c.Names[0] ?? c.Id).replace(/^\//, '');
		const enriched: EnrichedContainer = { ...c, Profile: ctnComposeProfile(c) };
		if (ctnHasHealthzLabel(c)) {
			const snap = latestByTarget.get(target);
			if (snap) enriched.Healthz = snap;
		}
		return enriched;
	});

	return { containers };
};
