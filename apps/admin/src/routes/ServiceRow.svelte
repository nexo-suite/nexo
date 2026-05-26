<script lang="ts">
	import type { ContainerInfo } from '$lib/server/docker';
	import {
		ctnDisplayName,
		ctnState,
		ctnComposeProfile,
		ctnUptimeLabel,
		type HealthzSnapshot
	} from '$lib/utils/containers';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		container: ContainerInfo & {
			RestartCount?: number;
			Healthz?: HealthzSnapshot;
		};
	}

	let { container: c }: Props = $props();
	const state = $derived(ctnState(c));
	const href = $derived(`/services/${(c.Names[0] ?? c.Id).replace(/^\//, '')}`);
	const isPreview = $derived(ctnComposeProfile(c) === 'preview');
</script>

<a {href} class="row">
	<StatusPill {state} compact />
	<div class="body">
		<div class="name">{ctnDisplayName(c)}</div>
		<div class="meta">{ctnUptimeLabel(c)}</div>
	</div>
	{#if isPreview}
		<span class="preview-chip">{m.preview_chip()}</span>
	{/if}
	<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"
		><path d="M6 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" /></svg
	>
</a>

<style>
	.row {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 56px;
		padding: 10px 14px;
		border-bottom: 1px solid var(--color-border-subtle);
		background: var(--color-surface-1);
		text-decoration: none;
		color: inherit;
		-webkit-tap-highlight-color: transparent;
		transition: background var(--duration-fast) var(--ease-out);
	}
	.row:last-child {
		border-bottom: 0;
	}
	.row:active {
		background: var(--color-bg-1);
	}
	.body {
		flex: 1;
		min-width: 0;
	}
	.name {
		font-size: 15.5px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--color-text-primary);
		text-transform: capitalize;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.meta {
		margin-top: 2px;
		font-family: var(--font-mono);
		font-size: 11.5px;
		color: var(--color-text-subtle);
	}
	.preview-chip {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 2px 7px;
		border-radius: 4px;
		color: oklch(0.74 0.16 78);
		background: color-mix(in oklab, oklch(0.74 0.16 78) 12%, var(--color-bg-1));
		border: 1px solid color-mix(in oklab, oklch(0.74 0.16 78) 32%, transparent);
		font-weight: 600;
		flex-shrink: 0;
	}
	.chev {
		width: 16px;
		height: 16px;
		color: var(--color-text-faint);
		flex-shrink: 0;
	}
</style>
