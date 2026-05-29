<script lang="ts">
	import type { Snippet } from 'svelte';
	import { ChevronLeft } from '@lucide/svelte';

	let {
		title,
		subtitle = null,
		eyebrow = null,
		details = null,
		backHref = null,
		backLabel = 'Back',
		actions,
		avatar
	}: {
		title: string;
		subtitle?: string | null;
		eyebrow?: string | null;
		details?: string[] | null;
		backHref?: string | null;
		backLabel?: string;
		actions?: Snippet;
		avatar?: Snippet;
	} = $props();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap"
	/>
</svelte:head>

<header class="ph">
	<div class="ph-row">
		{#if backHref}
			<a class="ph-back" href={backHref} aria-label={backLabel}>
				<ChevronLeft size={20} strokeWidth={1.8} />
			</a>
		{/if}

		<div class="ph-text">
			{#if eyebrow}
				<span class="ph-eyebrow">{eyebrow}</span>
			{/if}
			<h1 class="ph-title">{title}</h1>
			{#if subtitle}<p class="ph-subtitle">{subtitle}</p>{/if}
		</div>

		{#if actions || avatar}
			<div class="ph-right">
				{#if actions}{@render actions()}{/if}
				{#if avatar}{@render avatar()}{/if}
			</div>
		{/if}
	</div>

	{#if details && details.length > 0}
		<div class="ph-meta">
			{#each details as d, i (i)}
				{#if i > 0}<span class="ph-meta-sep" aria-hidden="true"></span>{/if}
				<span class="ph-meta-chip">{d}</span>
			{/each}
		</div>
	{/if}
</header>

<style>
	.ph {
		padding: 4px 0 22px;
		min-width: 0;
		font-family: var(--font-sans, system-ui, sans-serif);
	}

	.ph-row {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
	}

	.ph-back {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		margin-left: -8px;
		border-radius: 999px;
		color: var(--color-text-subtle, #71717a);
		text-decoration: none;
		flex-shrink: 0;
		transition: background var(--duration-fast, 120ms) var(--ease-out, ease-out);
	}
	.ph-back:hover,
	.ph-back:active {
		background: var(--color-bg-2, #ececea);
		color: var(--color-text-primary, #18181b);
	}

	.ph-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		line-height: 1.1;
	}

	.ph-eyebrow {
		display: inline-flex;
		align-items: center;
		align-self: flex-start;
		max-width: 100%;
		padding: 4px 10px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--color-accent) 7%, var(--color-surface-1, #fff));
		border: 1px solid color-mix(in oklab, var(--color-accent) 22%, transparent);
		font-family: var(--font-mono, ui-monospace, Menlo, monospace);
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: color-mix(in oklab, var(--color-accent) 80%, var(--color-text-primary));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
		margin-bottom: 2px;
	}

	.ph-title {
		margin: 0;
		font-family: var(--font-display, 'Instrument Serif', ui-serif, Georgia, serif);
		font-weight: 400;
		font-size: clamp(24px, 5.2vw, 28px);
		line-height: 1.05;
		letter-spacing: -0.022em;
		color: var(--color-text-primary, #18181b);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ph-subtitle {
		margin: 0;
		font-family: var(--font-sans, system-ui, sans-serif);
		font-size: 12.5px;
		line-height: 1.4;
		color: var(--color-text-subtle, #71717a);
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.ph-right {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.ph-meta {
		margin-top: 14px;
		padding-top: 12px;
		border-top: 1px solid var(--color-border-subtle, rgba(10, 10, 10, 0.06));
		font-family: var(--font-mono, ui-monospace, Menlo, monospace);
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-subtle, #71717a);
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		row-gap: 6px;
	}
	.ph-meta-chip {
		white-space: nowrap;
	}
	.ph-meta-chip:first-of-type {
		color: var(--color-text-muted, #52525b);
		font-weight: 500;
	}
	.ph-meta-sep {
		display: inline-block;
		width: 3px;
		height: 3px;
		border-radius: 999px;
		background: var(--color-text-faint, #c4bfca);
		flex-shrink: 0;
	}

	@media (prefers-reduced-motion: no-preference) {
		.ph-title {
			animation: ph-rise 600ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
		}
		.ph-subtitle {
			animation: ph-rise 600ms 60ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
		}
		.ph-eyebrow {
			animation: ph-rise 600ms 80ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
		}
		.ph-meta {
			animation: ph-rise 600ms 140ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
		}
	}

	@keyframes ph-rise {
		from {
			transform: translateY(6px);
			opacity: 0;
		}
		to {
			transform: none;
			opacity: 1;
		}
	}
</style>
