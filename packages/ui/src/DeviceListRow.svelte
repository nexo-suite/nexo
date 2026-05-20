<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		icon,
		label,
		metaLines,
		isCurrent = false,
		currentLabel = 'This device',
		actions
	}: {
		icon: string;
		label: string;
		metaLines: string[];
		isCurrent?: boolean;
		currentLabel?: string;
		actions?: Snippet;
	} = $props();
</script>

<div class="dlr" class:current={isCurrent}>
	<div class="dlr-icon">{icon}</div>
	<div class="dlr-text">
		<div class="dlr-label">
			<span class="dlr-label-text">{label}</span>
			{#if isCurrent}<span class="dlr-badge">{currentLabel}</span>{/if}
		</div>
		{#each metaLines as line}
			<div class="dlr-meta">{line}</div>
		{/each}
	</div>
	{#if actions}
		<div class="dlr-actions">{@render actions()}</div>
	{/if}
</div>

<style>
	.dlr {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		border-top: 1px solid var(--color-border-subtle);
	}
	.dlr:first-child {
		border-top: 0;
	}
	.dlr.current {
		background: color-mix(in oklab, var(--color-accent) 6%, transparent);
	}
	.dlr-icon {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: var(--color-bg-1);
		display: grid;
		place-items: center;
		font-size: 18px;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}
	.dlr-text {
		flex: 1;
		min-width: 0;
	}
	.dlr-label {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-primary);
	}
	.dlr-label-text {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.dlr-badge {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 6px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--color-accent) 15%, transparent);
		color: color-mix(in oklab, var(--color-accent) 80%, #000);
	}
	.dlr-meta {
		font-size: 12px;
		color: var(--color-text-subtle);
		margin-top: 2px;
		line-height: 1.4;
	}
	.dlr-actions {
		display: flex;
		gap: 6px;
		flex-shrink: 0;
	}
</style>
