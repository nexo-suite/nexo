<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ChevronLeft } from '@lucide/svelte';

	let {
		title,
		subtitle = null,
		backHref = null,
		backLabel = 'Back',
		actions,
		avatar
	}: {
		title: string;
		subtitle?: string | null;
		backHref?: string | null;
		backLabel?: string;
		actions?: Snippet;
		avatar?: Snippet;
	} = $props();
</script>

<header class="ph">
	{#if backHref}
		<a class="ph-back" href={backHref} aria-label={backLabel}>
			<ChevronLeft size={22} strokeWidth={1.8} />
		</a>
	{/if}
	<div class="ph-text">
		<h1 class="ph-title">{title}</h1>
		{#if subtitle}<p class="ph-subtitle">{subtitle}</p>{/if}
	</div>
	<div class="ph-right">
		{#if actions}{@render actions()}{/if}
		{#if avatar}{@render avatar()}{/if}
	</div>
</header>

<style>
	.ph {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 4px 0 12px;
		min-width: 0;
	}

	.ph-back {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		margin-left: -8px;
		border-radius: 999px;
		color: var(--color-text-subtle);
		text-decoration: none;
		flex-shrink: 0;
		transition: background var(--duration-fast, 120ms) var(--ease-out, ease-out);
	}

	.ph-back:hover,
	.ph-back:active {
		background: var(--color-bg-2);
		color: var(--color-text-primary);
	}

	.ph-text {
		flex: 1;
		min-width: 0;
		line-height: 1.2;
	}

	.ph-title {
		margin: 0;
		font-size: 22px;
		font-weight: 600;
		letter-spacing: -0.015em;
		color: var(--color-text-primary, #111);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ph-subtitle {
		margin: 2px 0 0;
		font-size: 13px;
		color: var(--color-text-subtle, #666);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ph-right {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}
</style>
