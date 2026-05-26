import type { ContainerInfo } from '$lib/server/docker';

export type CtnState = 'down' | 'pending' | 'degraded' | 'ok';

export interface HealthzSnapshot {
	ok: boolean;
	checkedAt: Date;
	error: string | null;
	latencyMs: number | null;
}

type CtnWithHealthz = ContainerInfo & { Healthz?: HealthzSnapshot };

export function ctnHasHealthzLabel(c: ContainerInfo): boolean {
	return c.Labels?.['nexo.healthz'] === 'true';
}

export function ctnName(c: ContainerInfo): string {
	return (c.Names[0] ?? c.Id).replace(/^\//, '').replace(/-\d+$/, '');
}

export function ctnDisplayName(c: ContainerInfo): string {
	return ctnName(c)
		.replace(/^nexo-/, '')
		.replace(/_/g, ' ');
}

// Docker emits "(healthy)" / "(unhealthy)" / "(health: starting)" in the human
// Status string. We pull this back out for the state machine.
type DockerHealth = 'healthy' | 'unhealthy' | 'starting' | 'none';

function dockerHealth(c: ContainerInfo): DockerHealth {
	const s = c.Status ?? '';
	if (/\(unhealthy\)/i.test(s)) return 'unhealthy';
	if (/\(health: starting\)/i.test(s) || /\(starting\)/i.test(s)) return 'starting';
	if (/\(healthy\)/i.test(s)) return 'healthy';
	return 'none';
}

// Single source of truth for service state. AND-style: any red downgrades.
//
//   down      — process not running (exited / dead / restarting / created / paused).
//   pending   — running but not yet confirmed healthy (Docker health: starting,
//               OR no /healthz row in admin.health_check_run yet).
//   degraded  — running but at least one signal is red:
//                 • /healthz.ok = false (latest poll snapshot), OR
//                 • Docker reports (unhealthy)
//   ok        — running, Docker says healthy (or no docker healthcheck), and
//               the latest /healthz row is green.
//
// Containers without the `nexo.healthz` label collapse to a 2-state model
// (down / ok) because we don't probe them and don't expect a /healthz endpoint.
export function ctnState(c: CtnWithHealthz): CtnState {
	const s = c.State.toLowerCase();
	if (s !== 'running') return 'down';

	const dh = dockerHealth(c);
	const probed = ctnHasHealthzLabel(c);

	if (!probed) {
		// Infra (postgres, pgbouncer, loki, …): trust Docker's own healthcheck.
		if (dh === 'unhealthy') return 'degraded';
		if (dh === 'starting') return 'pending';
		return 'ok';
	}

	// Probed services have to satisfy both Docker AND the /healthz poller.
	if (dh === 'unhealthy') return 'degraded';
	if (c.Healthz?.ok === false) return 'degraded';
	if (dh === 'starting') return 'pending';
	if (!c.Healthz) return 'pending'; // no row recorded yet
	return 'ok';
}

export function ctnUptimeLabel(c: ContainerInfo): string {
	if (c.State.toLowerCase() !== 'running') return 'stopped';
	// Strip trailing health annotation: "Up 2 hours (healthy)" → "up 2 hours"
	return c.Status.replace(/^Up\s+/i, 'up ').replace(/\s*\([^)]*\)\s*$/, '');
}

export function ctnComposeProfile(c: ContainerInfo): 'production' | 'preview' | 'unknown' {
	const networks = c.NetworkSettings?.Networks ?? {};
	for (const name of Object.keys(networks)) {
		if (name.includes('production')) return 'production';
		if (name.includes('preview')) return 'preview';
	}
	return 'unknown';
}

// Apps vs infra split for the home page sectioning. Apps render in their own
// section; infra collapses under one row by default.
export function ctnIsApp(c: ContainerInfo): boolean {
	return ctnHasHealthzLabel(c);
}
