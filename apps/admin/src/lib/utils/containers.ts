import type { ContainerInfo } from '$lib/server/docker';

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

export function ctnTone(c: ContainerInfo): string {
	const s = c.State.toLowerCase();
	if (s === 'restarting') return 'err';
	if (s === 'running') return 'ok';
	return 'mute';
}

export function ctnStatusLabel(c: ContainerInfo): string {
	const s = c.State.toLowerCase();
	if (s === 'running') return 'Running';
	if (s === 'restarting') return 'Restarting';
	if (s === 'exited') return 'Stopped';
	return c.State;
}

export function ctnUptimeLabel(c: ContainerInfo): string {
	if (c.State.toLowerCase() !== 'running') return 'stopped';
	return c.Status.replace(/^Up\s+/i, 'up ');
}

export function ctnImageTag(c: ContainerInfo): string {
	const img = c.Image;
	const tag = img.split(':')[1];
	if (tag) return tag;
	return img.split('/').pop() ?? img;
}
