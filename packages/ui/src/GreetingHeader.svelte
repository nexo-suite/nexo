<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		name,
		greeting = 'Hey,',
		eyebrow = null,
		details = null,
		density = 'lush',
		actions,
		avatar
	}: {
		name: string;
		greeting?: string;
		eyebrow?: string | null;
		details?: string[] | null;
		density?: 'lush' | 'compact';
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

<header class="gh" data-density={density}>
	<div class="gh-top">
		{#if eyebrow}
			<span class="gh-eyebrow">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
				</svg>
				<span>{eyebrow}</span>
			</span>
		{:else}
			<span></span>
		{/if}
		{#if actions || avatar}
			<div class="gh-right">
				{#if actions}{@render actions()}{/if}
				{#if avatar}{@render avatar()}{/if}
			</div>
		{/if}
	</div>

	<div class="gh-line">
		<span class="gh-hi">{greeting}</span>
		<span class="gh-name-wrap">
			<span class="gh-name">{name}{#if density === 'lush'}<span class="gh-spark" aria-hidden="true">*</span>{/if}</span>
			{#if density === 'lush'}
				<svg
					class="gh-underline"
					viewBox="0 0 240 14"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					<path d="M2 10 C 40 4, 80 12, 120 7 S 200 12, 238 6" />
				</svg>
			{/if}
		</span>
	</div>

	{#if details && details.length > 0}
		<div class="gh-meta">
			{#each details as d, i (i)}
				{#if i > 0}<span class="gh-meta-sep" aria-hidden="true"></span>{/if}
				<span class="gh-meta-chip">{d}</span>
			{/each}
		</div>
	{/if}
</header>

<style>
	.gh {
		position: relative;
		padding: 4px 0 28px;
		min-width: 0;
		font-family: var(--font-sans, system-ui, sans-serif);
	}

	.gh-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 10px;
		min-height: 32px;
	}

	.gh-eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		max-width: 100%;
		padding: 5px 11px 5px 9px;
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
	}
	.gh-eyebrow svg {
		width: 10px;
		height: 10px;
		flex-shrink: 0;
	}
	.gh-eyebrow span {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.gh-right {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
		margin-left: auto;
	}

	.gh-line {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 8px;
		line-height: 0.96;
	}

	.gh-hi {
		font-family: var(--font-display, 'Instrument Serif', ui-serif, Georgia, serif);
		font-style: italic;
		font-weight: 400;
		font-size: clamp(38px, 9.5vw, 50px);
		letter-spacing: -0.02em;
		color: var(--color-text-muted, #52525b);
	}

	.gh-name-wrap {
		position: relative;
		display: inline-block;
		min-width: 0;
	}

	.gh-name {
		font-family: var(--font-display, 'Instrument Serif', ui-serif, Georgia, serif);
		font-weight: 400;
		font-style: normal;
		font-size: clamp(44px, 11vw, 58px);
		letter-spacing: -0.025em;
		color: var(--color-text-primary, #18181b);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.gh-spark {
		display: inline-block;
		color: var(--color-accent);
		font-family: var(--font-display, 'Instrument Serif', ui-serif, Georgia, serif);
		font-style: italic;
		font-size: 0.78em;
		transform: translateY(-0.18em);
		margin-left: 0.04em;
		transform-origin: center;
	}

	.gh-underline {
		position: absolute;
		left: -4px;
		right: -4px;
		bottom: -7px;
		height: 12px;
		pointer-events: none;
		overflow: visible;
	}
	.gh-underline path {
		fill: none;
		stroke: var(--color-accent);
		stroke-width: 2.2;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-dasharray: 320;
		stroke-dashoffset: 0;
	}

	.gh-meta {
		margin-top: 18px;
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
	.gh-meta-chip {
		white-space: nowrap;
	}
	.gh-meta-chip:first-of-type {
		color: var(--color-text-muted, #52525b);
		font-weight: 500;
	}
	.gh-meta-sep {
		display: inline-block;
		width: 3px;
		height: 3px;
		border-radius: 999px;
		background: var(--color-text-faint, #c4bfca);
		flex-shrink: 0;
	}

	/* Compact density: kill the ornament + squiggle, dial the headline down */
	.gh[data-density='compact'] .gh-hi {
		font-size: clamp(28px, 6.5vw, 36px);
	}
	.gh[data-density='compact'] .gh-name {
		font-size: clamp(30px, 7vw, 40px);
	}
	.gh[data-density='compact'] {
		padding: 4px 0 20px;
	}

	@media (prefers-reduced-motion: no-preference) {
		.gh-line {
			animation: gh-rise 700ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
		}
		.gh-eyebrow {
			animation: gh-rise 700ms 80ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
		}
		.gh-meta {
			animation: gh-rise 700ms 200ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
		}
		.gh-underline path {
			stroke-dashoffset: 320;
			animation: gh-draw 900ms 280ms cubic-bezier(0.65, 0, 0.35, 1) forwards;
		}
		.gh-spark {
			animation: gh-spark 6s ease-in-out infinite;
		}
	}

	@keyframes gh-draw {
		to {
			stroke-dashoffset: 0;
		}
	}
	@keyframes gh-rise {
		from {
			transform: translateY(8px);
			opacity: 0;
			filter: blur(2px);
		}
		to {
			transform: none;
			opacity: 1;
			filter: blur(0);
		}
	}
	@keyframes gh-spark {
		0%,
		100% {
			transform: translateY(-0.18em) rotate(0deg);
		}
		50% {
			transform: translateY(-0.24em) rotate(14deg);
		}
	}
</style>
