<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { CtnState } from '$lib/utils/containers';

	interface Props {
		state: CtnState;
		children?: Snippet;
		compact?: boolean;
	}

	let { state, children, compact = false }: Props = $props();
</script>

<span class="pill {state}" class:compact>
	<span class="dot" aria-hidden="true"></span>
	{#if children}{@render children()}{:else}<span class="label">{state}</span>{/if}
</span>

<style>
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 3px 10px 3px 8px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		font-family: var(--font-mono);
		background: var(--color-bg-1);
		color: var(--color-text-muted);
		border: 1px solid var(--color-border-default);
	}
	.pill.compact {
		padding: 2px 8px 2px 6px;
		font-size: 10px;
	}
	.dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: currentColor;
		flex-shrink: 0;
		box-shadow: 0 0 0 2px color-mix(in oklab, currentColor 22%, transparent);
	}
	.label {
		text-transform: capitalize;
	}

	.pill.ok {
		color: oklch(0.62 0.18 145);
		background: color-mix(in oklab, oklch(0.62 0.18 145) 8%, var(--color-bg-1));
		border-color: color-mix(in oklab, oklch(0.62 0.18 145) 24%, var(--color-border-default));
	}
	.pill.ok .dot {
		animation: pulse 2.6s cubic-bezier(0.65, 0, 0.35, 1) infinite;
	}
	.pill.pending {
		color: oklch(0.74 0.16 78);
		background: color-mix(in oklab, oklch(0.74 0.16 78) 10%, var(--color-bg-1));
		border-color: color-mix(in oklab, oklch(0.74 0.16 78) 28%, var(--color-border-default));
	}
	.pill.degraded,
	.pill.down {
		color: oklch(0.59 0.2 27);
		background: color-mix(in oklab, oklch(0.59 0.2 27) 10%, var(--color-bg-1));
		border-color: color-mix(in oklab, oklch(0.59 0.2 27) 28%, var(--color-border-default));
	}
	.pill.completed {
		color: oklch(0.6 0.12 240);
		background: color-mix(in oklab, oklch(0.6 0.12 240) 8%, var(--color-bg-1));
		border-color: color-mix(in oklab, oklch(0.6 0.12 240) 24%, var(--color-border-default));
	}

	@keyframes pulse {
		0%,
		100% {
			box-shadow: 0 0 0 2px color-mix(in oklab, currentColor 22%, transparent);
		}
		50% {
			box-shadow: 0 0 0 4px color-mix(in oklab, currentColor 8%, transparent);
		}
	}
</style>
