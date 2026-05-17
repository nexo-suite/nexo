<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	let { version }: { version: string } = $props();
</script>

<nav class="border-border-subtle bg-bg-0/80 sticky top-0 z-40 border-b backdrop-blur-md">
	<div class="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-6">
		<div class="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
			<img src="/favicon.svg" alt="Nexo" class="brand-mark" />
			Nexo
		</div>
		<span class="text-text-faint hidden font-mono text-[10px] tracking-widest uppercase sm:block">
			v{version}
		</span>
	</div>
</nav>

<header class="relative overflow-hidden py-20 md:py-28">
	<div class="hero-bg pointer-events-none absolute inset-0 z-0"></div>
	<div class="relative z-10 mx-auto max-w-[1100px] px-6 text-center">
		<div class="eyebrow-pill">
			<span class="eyebrow-dot"></span>
			{m.hero_eyebrow()}
		</div>
		<h1 class="hero-title">{m.hero_title()}</h1>
		<p
			class="text-text-muted mx-auto mt-5 max-w-[520px] text-[clamp(16px,1.5vw,18px)] leading-relaxed"
		>
			{m.hero_tagline()}
		</p>
		<div class="hero-meta">
			<span><b>{m.hero_meta_live()}</b></span>
			<span><b>{m.hero_meta_cooking()}</b></span>
			<span>{m.hero_meta_dev()}</span>
		</div>
	</div>
</header>

<style>
	.brand-mark {
		width: 22px;
		height: 22px;
		display: block;
	}

	.hero-bg {
		background:
			radial-gradient(
				ellipse 70% 50% at 50% 0%,
				color-mix(in oklab, var(--color-accent) 18%, transparent),
				transparent 65%
			),
			linear-gradient(to right, rgb(10 10 10 / 0.04) 1px, transparent 1px) 0 0 / 56px 56px,
			linear-gradient(to bottom, rgb(10 10 10 / 0.04) 1px, transparent 1px) 0 0 / 56px 56px,
			var(--color-bg-0);
		mask-image: radial-gradient(ellipse 80% 70% at 50% 20%, #000 0%, #000 40%, transparent 100%);
	}

	.hero-title {
		font-size: clamp(64px, 9vw, 112px);
		line-height: 0.94;
		letter-spacing: -0.04em;
		font-weight: 600;
		margin: 0 0 8px;
		background: linear-gradient(
			175deg,
			#18181b 0%,
			color-mix(in oklab, #18181b 55%, var(--color-bg-0)) 100%
		);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.eyebrow-dot {
		display: inline-block;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--color-accent);
		animation: pulse 2.4s var(--ease-in-out) infinite;
		flex-shrink: 0;
	}

	.eyebrow-pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		border: 1px solid var(--color-border-default);
		background: var(--color-surface-1);
		border-radius: 999px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-muted);
		margin-bottom: 20px;
		box-shadow: 0 2px 8px -2px rgb(0 0 0 / 0.06);
	}

	.hero-meta {
		margin-top: 24px;
		display: inline-flex;
		gap: 6px;
		flex-wrap: wrap;
		justify-content: center;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-text-subtle);
	}
	.hero-meta span {
		padding: 5px 9px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: 999px;
		box-shadow: 0 2px 8px -2px rgb(0 0 0 / 0.06);
	}
	.hero-meta b {
		color: var(--color-text-primary);
		font-weight: 500;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.4;
			transform: scale(0.75);
		}
	}
</style>
