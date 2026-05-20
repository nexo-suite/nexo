import type { ContainerInfo } from '$lib/server/docker';

type CtnHealth = 'healthy' | 'unhealthy' | 'starting' | 'none';
export type CtnTone = 'ok' | 'warn' | 'err' | 'mute';

export function ctnName(c: ContainerInfo): string {
	return (c.Names[0] ?? c.Id).replace(/^\//, '').replace(/-\d+$/, '');
}

export function ctnDisplayName(c: ContainerInfo): string {
	return ctnName(c)
		.replace(/^nexo-/, '')
		.replace(/_/g, ' ');
}

export function ctnGroup(c: ContainerInfo): string {
	const n = ctnName(c).toLowerCase();
	if (n.includes('auth') || n.includes('www') || n.includes('landing')) return 'core';
	if (
		n.includes('finance') ||
		n.includes('flaschen') ||
		n.includes('gym') ||
		n.includes('time') ||
		n.includes('pomodoro') ||
		n.includes('admin')
	)
		return 'app';
	if (
		n.includes('postgres') ||
		n.includes('redis') ||
		n.includes('minio') ||
		n.includes('mongo') ||
		n.includes('db')
	)
		return 'data';
	return 'infra';
}

// Docker emits "(healthy)" / "(unhealthy)" / "(health: starting)" in the human Status string.
function ctnHealth(c: ContainerInfo): CtnHealth {
	const s = c.Status ?? '';
	if (/\(unhealthy\)/i.test(s)) return 'unhealthy';
	if (/\(health: starting\)/i.test(s) || /\(starting\)/i.test(s)) return 'starting';
	if (/\(healthy\)/i.test(s)) return 'healthy';
	return 'none';
}

export function ctnTone(c: ContainerInfo): CtnTone {
	const s = c.State.toLowerCase();
	if (s === 'restarting') return 'err';
	if (s !== 'running') return 'mute';
	const h = ctnHealth(c);
	if (h === 'unhealthy') return 'err';
	if (h === 'starting') return 'warn';
	return 'ok';
}

export function ctnStatusLabel(c: ContainerInfo): string {
	const s = c.State.toLowerCase();
	if (s === 'restarting') return 'Restarting';
	if (s === 'exited') return 'Stopped';
	if (s === 'dead') return 'Dead';
	if (s === 'created') return 'Created';
	if (s === 'paused') return 'Paused';
	if (s === 'running') {
		const h = ctnHealth(c);
		if (h === 'unhealthy') return 'Unhealthy';
		if (h === 'starting') return 'Starting';
		if (h === 'healthy') return 'Healthy';
		return 'Running';
	}
	return c.State;
}

export function ctnHasIssue(c: ContainerInfo): boolean {
	const s = c.State.toLowerCase();
	if (s === 'restarting' || s === 'dead') return true;
	if (s === 'running' && ctnHealth(c) === 'unhealthy') return true;
	return false;
}

export function ctnIsHealthy(c: ContainerInfo): boolean {
	if (c.State.toLowerCase() !== 'running') return false;
	const h = ctnHealth(c);
	return h === 'healthy' || h === 'none';
}

export function ctnIsStopped(c: ContainerInfo): boolean {
	const s = c.State.toLowerCase();
	return s === 'exited' || s === 'dead' || s === 'created';
}

export function ctnUptimeLabel(c: ContainerInfo): string {
	if (c.State.toLowerCase() !== 'running') return 'stopped';
	// Strip trailing health annotation: "Up 2 hours (healthy)" → "up 2 hours"
	return c.Status.replace(/^Up\s+/i, 'up ').replace(/\s*\([^)]*\)\s*$/, '');
}

export function ctnImageTag(c: ContainerInfo): string {
	const img = c.Image;
	const tag = img.split(':')[1];
	if (tag) return tag;
	return img.split('/').pop() ?? img;
}

export function ctnComposeProfile(c: ContainerInfo): 'production' | 'preview' | 'unknown' {
	const networks = c.NetworkSettings?.Networks ?? {};
	for (const name of Object.keys(networks)) {
		if (name.includes('production')) return 'production';
		if (name.includes('preview')) return 'preview';
	}
	return 'unknown';
}
