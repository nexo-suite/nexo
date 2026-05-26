import { dev } from '$app/environment';
import type {
	ContainerInfo,
	ContainerInspect,
	ContainerStats,
	HealthzResult
} from '$lib/server/docker';
import type { HealthzSnapshot } from '$lib/utils/containers';

/**
 * Local-dev fixture layer. Activates only when `dev === true` AND the real
 * backend (Docker socket / Postgres) isn't reachable. In production this
 * module is dead code — no fixtures are ever served.
 *
 * Coverage:
 *   • /containers/json                — list (home page)
 *   • /containers/{id}/json           — inspect (services detail)
 *   • /containers/{id}/stats          — raw stats (services detail)
 *   • health snapshots / history      — Postgres-backed admin.health_check_run
 */

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

function uptimeStatus(startedAtMs: number, healthAnnot?: string): string {
	const upMin = Math.max(1, Math.round((Date.now() - startedAtMs) / MIN));
	const human =
		upMin < 60
			? `Up ${upMin} minute${upMin === 1 ? '' : 's'}`
			: upMin < 60 * 24
				? `Up ${Math.round(upMin / 60)} hour${Math.round(upMin / 60) === 1 ? '' : 's'}`
				: `Up ${Math.round(upMin / (60 * 24))} day${Math.round(upMin / (60 * 24)) === 1 ? '' : 's'}`;
	return healthAnnot ? `${human} (${healthAnnot})` : human;
}

interface MockSpec {
	name: string;
	image: string;
	state: 'running' | 'exited' | 'restarting';
	health?: 'healthy' | 'unhealthy' | 'starting';
	probed: boolean;
	network: 'production' | 'preview';
	startedMinutesAgo: number;
	exitCode?: number;
	restartCount?: number;
	healthz?: { ok: boolean; latencyMs: number | null; error: string | null; minutesAgo: number };
}

const SPECS: MockSpec[] = [
	{
		name: 'nexo-finance-1',
		image: 'ghcr.io/krieger2501/nexo-finance:1.4.2',
		state: 'running',
		health: 'healthy',
		probed: true,
		network: 'production',
		startedMinutesAgo: 60 * 36,
		healthz: { ok: true, latencyMs: 41, error: null, minutesAgo: 1 }
	},
	{
		name: 'nexo-admin-1',
		image: 'ghcr.io/krieger2501/nexo-admin:1.4.2',
		state: 'running',
		health: 'healthy',
		probed: true,
		network: 'production',
		startedMinutesAgo: 60 * 36,
		healthz: { ok: true, latencyMs: 18, error: null, minutesAgo: 1 }
	},
	{
		name: 'nexo-calorie-1',
		image: 'ghcr.io/krieger2501/nexo-calorie:0.3.1',
		state: 'running',
		health: 'unhealthy',
		probed: true,
		network: 'production',
		startedMinutesAgo: 22,
		restartCount: 3,
		healthz: {
			ok: false,
			latencyMs: 5012,
			error: 'fetch timed out after 5000ms',
			minutesAgo: 2
		}
	},
	{
		name: 'nexo-flaschen-1',
		image: 'ghcr.io/krieger2501/nexo-flaschen:1.0.7',
		state: 'exited',
		probed: true,
		network: 'production',
		startedMinutesAgo: 60 * 4,
		exitCode: 137
	},
	{
		name: 'nexo-auth-1',
		image: 'ghcr.io/krieger2501/nexo-auth:1.4.2',
		state: 'running',
		health: 'starting',
		probed: true,
		network: 'production',
		startedMinutesAgo: 1
	},
	{
		name: 'nexo-postgres-1',
		image: 'postgres:17-alpine',
		state: 'running',
		health: 'healthy',
		probed: false,
		network: 'production',
		startedMinutesAgo: 60 * 24 * 9
	},
	{
		name: 'nexo-loki-1',
		image: 'grafana/loki:3.2.0',
		state: 'running',
		health: 'healthy',
		probed: false,
		network: 'production',
		startedMinutesAgo: 60 * 24 * 9
	},
	{
		name: 'nexo-grafana-1',
		image: 'grafana/grafana:11.3.0',
		state: 'running',
		health: 'healthy',
		probed: false,
		network: 'production',
		startedMinutesAgo: 60 * 24 * 9
	},
	{
		name: 'nexo-traefik-1',
		image: 'traefik:v3.2',
		state: 'restarting',
		probed: false,
		network: 'production',
		startedMinutesAgo: 0,
		restartCount: 5
	}
];

function mockContainerInfo(spec: MockSpec): ContainerInfo & { RestartCount?: number } {
	const startedAtMs = Date.now() - spec.startedMinutesAgo * MIN;
	const labels: Record<string, string> = {
		'com.docker.compose.project': 'nexo',
		'com.docker.compose.service': spec.name.replace(/^nexo-/, '').replace(/-\d+$/, ''),
		'com.docker.compose.profile': spec.network
	};
	if (spec.probed) labels['nexo.healthz'] = 'true';

	let status: string;
	if (spec.state === 'exited') {
		status = `Exited (${spec.exitCode ?? 0}) ${Math.round((Date.now() - startedAtMs) / MIN)} minutes ago`;
	} else if (spec.state === 'restarting') {
		status = 'Restarting (1) 8 seconds ago';
	} else {
		status = uptimeStatus(
			startedAtMs,
			spec.health === 'starting'
				? 'health: starting'
				: spec.health === 'healthy'
					? 'healthy'
					: spec.health === 'unhealthy'
						? 'unhealthy'
						: undefined
		);
	}

	return {
		Id: idFor(spec.name),
		Names: [`/${spec.name}`],
		Image: spec.image,
		State: spec.state,
		Status: status,
		Created: Math.floor(startedAtMs / 1000),
		Labels: labels,
		NetworkSettings: {
			Networks: {
				[`nexo-${spec.network}`]: {
					IPAddress: `172.20.${spec.network === 'production' ? '0' : '1'}.${10 + SPECS.indexOf(spec)}`
				}
			}
		},
		RestartCount: spec.restartCount ?? 0
	};
}

function idFor(name: string): string {
	let h = 0;
	for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
	const hex = h.toString(16).padStart(8, '0');
	return `${hex}${hex}${hex}`.slice(0, 64);
}

function specByNameOrId(key: string): MockSpec | null {
	const stripped = key.replace(/^\//, '');
	const direct = SPECS.find((s) => s.name === stripped);
	if (direct) return direct;
	return SPECS.find((s) => idFor(s.name) === stripped) ?? null;
}

export function mockListContainers(): (ContainerInfo & { RestartCount?: number })[] {
	return SPECS.map(mockContainerInfo);
}

export function mockInspect(nameOrId: string): ContainerInspect | null {
	const spec = specByNameOrId(nameOrId);
	if (!spec) return null;
	const startedAt = new Date(Date.now() - spec.startedMinutesAgo * MIN);
	const labels: Record<string, string> = {
		'com.docker.compose.project': 'nexo',
		'com.docker.compose.service': spec.name.replace(/^nexo-/, '').replace(/-\d+$/, ''),
		'com.docker.compose.profile': spec.network,
		'nexo.commit': '8158410',
		'nexo.build_time': new Date(Date.now() - 8 * HOUR).toISOString()
	};
	if (spec.probed) labels['nexo.healthz'] = 'true';

	return {
		Id: idFor(spec.name),
		Name: `/${spec.name}`,
		Created: startedAt.toISOString(),
		Image: `sha256:${idFor(spec.image)}`,
		RestartCount: spec.restartCount ?? 0,
		State: {
			Status: spec.state === 'restarting' ? 'restarting' : spec.state,
			Running: spec.state === 'running',
			StartedAt: startedAt.toISOString(),
			FinishedAt: spec.state === 'exited' ? new Date().toISOString() : '',
			ExitCode: spec.exitCode ?? 0,
			Health: spec.health
				? {
						Status: spec.health,
						FailingStreak: spec.health === 'unhealthy' ? 4 : 0,
						Log:
							spec.health === 'unhealthy'
								? [
										{
											Start: new Date(Date.now() - 30 * 1000).toISOString(),
											ExitCode: 1,
											Output: 'curl: (28) Connection timed out after 5000 ms\n'
										}
									]
								: []
					}
				: undefined
		},
		Config: {
			Image: spec.image,
			Labels: labels,
			ExposedPorts: { '3000/tcp': {} }
		},
		NetworkSettings: {
			Networks: {
				[`nexo-${spec.network}`]: {
					IPAddress: `172.20.${spec.network === 'production' ? '0' : '1'}.${10 + SPECS.indexOf(spec)}`,
					Aliases: [spec.name.replace(/^nexo-/, '').replace(/-\d+$/, '')]
				}
			}
		},
		HostConfig: {
			RestartPolicy: { Name: 'unless-stopped', MaximumRetryCount: 0 }
		}
	};
}

export function mockStats(nameOrId: string): ContainerStats {
	const spec = specByNameOrId(nameOrId);
	if (!spec || spec.state !== 'running') {
		return { cpuPercent: null, memoryUsedBytes: null, memoryLimitBytes: null };
	}
	// Plausible numbers — slightly elevated for the unhealthy one.
	const base = spec.health === 'unhealthy' ? 64 : 8 + (SPECS.indexOf(spec) % 5) * 4;
	return {
		cpuPercent: base + Math.random() * 4,
		memoryUsedBytes: (140 + (SPECS.indexOf(spec) % 4) * 60) * 1024 * 1024,
		memoryLimitBytes: 512 * 1024 * 1024
	};
}

export function mockHealthSnapshots(): Map<string, HealthzSnapshot> {
	const m = new Map<string, HealthzSnapshot>();
	for (const spec of SPECS) {
		if (!spec.probed || !spec.healthz) continue;
		m.set(spec.name, {
			ok: spec.healthz.ok,
			checkedAt: new Date(Date.now() - spec.healthz.minutesAgo * MIN),
			error: spec.healthz.error,
			latencyMs: spec.healthz.latencyMs
		});
	}
	return m;
}

interface HistoryRow {
	checkedAt: Date;
	ok: boolean;
	latencyMs: number | null;
}

/** Synthesizes a 24h history of /healthz polls at 30-minute cadence. */
export function mockHealthHistory(target: string): HistoryRow[] {
	const spec = specByNameOrId(target);
	if (!spec || !spec.probed) return [];
	const rows: HistoryRow[] = [];
	const cadenceMs = 30 * MIN;
	const total = (24 * HOUR) / cadenceMs;
	for (let i = total - 1; i >= 0; i--) {
		const checkedAt = new Date(Date.now() - i * cadenceMs);
		// Recent failures only for the unhealthy spec; one or two random blips for others.
		let ok: boolean;
		let latencyMs: number;
		if (spec.health === 'unhealthy') {
			ok = i > 4 ? Math.random() > 0.08 : false;
			latencyMs = ok ? 38 + Math.random() * 30 : 5000;
		} else if (spec.health === 'starting') {
			ok = true;
			latencyMs = 90 + Math.random() * 60;
		} else {
			ok = Math.random() > 0.015;
			latencyMs = 18 + Math.random() * 28;
		}
		rows.push({ checkedAt, ok, latencyMs: Math.round(latencyMs) });
	}
	return rows;
}

export function mockHealthzResult(nameOrId: string): HealthzResult {
	const spec = specByNameOrId(nameOrId);
	const ok = Boolean(spec) && spec?.healthz?.ok === true;
	return {
		ok,
		status: ok ? 200 : spec?.healthz ? 503 : 0,
		body: ok
			? {
					ok: true,
					version: '1.4.2',
					commit: '8158410',
					buildTime: new Date(Date.now() - 8 * HOUR).toISOString(),
					checks: { db: { ok: true, latency_ms: 4 } },
					latency_ms: spec?.healthz?.latencyMs ?? 20
				}
			: null,
		latency_ms: spec?.healthz?.latencyMs ?? 0,
		url: spec ? `http://${spec.name.replace(/^nexo-/, '').replace(/-\d+$/, '')}:3000/healthz` : '',
		error: spec?.healthz?.error ?? undefined
	};
}

interface NodeError {
	code?: string;
}

export function isSocketUnreachable(err: unknown): boolean {
	const code = (err as NodeError | null)?.code;
	return code === 'ENOENT' || code === 'ECONNREFUSED' || code === 'EACCES';
}

let warnedOnce = false;
export function warnOnceMockActive(): void {
	if (!dev || warnedOnce) return;
	warnedOnce = true;
	// eslint-disable-next-line no-console
	console.info(
		'[nexo-admin] dev: Docker socket unreachable, serving mock containers. Start Docker or set DOCKER_SOCKET to disable.'
	);
}

export function devMockEnabled(): boolean {
	return dev;
}
