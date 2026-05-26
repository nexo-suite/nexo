<script lang="ts">
	import { page } from '$app/state';

	const status = $derived(page.status);
	const isMissing = $derived(status === 404);
	const heading = $derived(isMissing ? 'Off the trail.' : 'Something burnt.');
	const sub = $derived(
		isMissing
			? "We couldn't find that page. Your log is fine — only this stop is missing."
			: 'A small kitchen mishap. Your data is safe; the page is not.'
	);
</script>

<svelte:head>
	<title>{status} — Calorie</title>
</svelte:head>

<main class="sys" data-mood={isMissing ? 'missing' : 'burnt'}>
	<div class="sys-wash" aria-hidden="true"></div>
	<div class="sys-grid" aria-hidden="true"></div>

	<section class="tablet">
		<header class="head">
			<span class="brand serif-italic">Calorie</span>
			<span class="eyebrow">
				<span class="dot" aria-hidden="true"></span>
				error · {String(status).padStart(3, '0')}
			</span>
		</header>

		<div class="num-row">
			<span class="num numeral" aria-hidden="true">{status}</span>
			<div class="rule" aria-hidden="true">
				<svg viewBox="0 0 60 60" fill="none">
					<circle cx="30" cy="30" r="22" stroke="currentColor" stroke-width="0.8" stroke-dasharray="2 3" opacity="0.55" />
					<circle cx="30" cy="30" r="14" stroke="currentColor" stroke-width="0.8" opacity="0.4" />
					<line x1="30" y1="6" x2="30" y2="14" stroke="currentColor" stroke-width="0.8" opacity="0.5" />
					<line x1="30" y1="46" x2="30" y2="54" stroke="currentColor" stroke-width="0.8" opacity="0.5" />
					<line x1="6" y1="30" x2="14" y2="30" stroke="currentColor" stroke-width="0.8" opacity="0.5" />
					<line x1="46" y1="30" x2="54" y2="30" stroke="currentColor" stroke-width="0.8" opacity="0.5" />
				</svg>
			</div>
		</div>

		<h1 class="msg serif-display">{heading}</h1>
		<p class="sub">{sub}</p>

		<blockquote class="quote">
			<span class="qopen" aria-hidden="true">&ldquo;</span>
			<span class="serif-italic">A meal off the plan is still a meal worth eating.</span>
		</blockquote>

		<div class="actions">
			<a href="/" class="primary">
				<span>Back to today</span>
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
					<path d="M4 8h8M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</a>
			<button type="button" class="ghost" onclick={() => window.location.reload()}>
				try again
			</button>
		</div>
	</section>
</main>

<style>
	.sys {
		position: relative;
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 24px 16px;
		background: var(--color-bg-0);
		isolation: isolate;
		overflow: hidden;
		color: var(--color-text-primary);
		font-family: var(--font-sans);
	}

	.sys[data-mood='missing'] {
		--mood: var(--color-ember);
		--mood-soft: color-mix(in oklab, var(--color-ember) 14%, transparent);
		--mood-ink: var(--color-ember-deep);
	}
	.sys[data-mood='burnt'] {
		--mood: var(--color-overtarget);
		--mood-soft: color-mix(in oklab, var(--color-overtarget) 16%, transparent);
		--mood-ink: color-mix(in oklab, var(--color-overtarget) 70%, #000);
	}

	/* Warm wash + parchment grid */
	.sys-wash {
		position: absolute;
		inset: 0;
		z-index: -2;
		background:
			radial-gradient(circle at 18% 12%, var(--color-ember-tint), transparent 42%),
			radial-gradient(circle at 88% 84%, color-mix(in oklab, var(--color-ember-glow) 50%, transparent), transparent 52%),
			var(--color-bg-0);
	}

	.sys-grid {
		position: absolute;
		inset: 0;
		z-index: -1;
		background:
			linear-gradient(to right, color-mix(in oklab, var(--color-ember) 10%, transparent) 1px, transparent 1px) 0 0 / 64px 64px,
			linear-gradient(to bottom, color-mix(in oklab, var(--color-ember) 10%, transparent) 1px, transparent 1px) 0 0 / 64px 64px;
		mask-image: radial-gradient(ellipse 80% 70% at 50% 30%, #000 0%, #000 40%, transparent 100%);
		opacity: 0.5;
	}

	.tablet {
		position: relative;
		width: 100%;
		max-width: 420px;
		padding: 28px 28px 22px;
		background: var(--color-surface-1);
		border: 1px solid var(--ember-line);
		border-radius: var(--radius-2xl);
		box-shadow:
			0 1px 0 rgb(255 255 255 / 0.6) inset,
			0 18px 50px -22px color-mix(in oklab, var(--color-ember) 36%, transparent),
			0 4px 12px -6px rgb(40 18 8 / 0.08);
		animation: card-in 700ms var(--ease-out) both;
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-bottom: 18px;
	}

	.brand {
		font-size: 22px;
		color: var(--mood-ink);
		font-variation-settings:
			'opsz' 24,
			'SOFT' 100,
			'wght' 480,
			'ital' 1;
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 5px 11px;
		background: var(--ember-tint-bg);
		border: 1px solid var(--ember-line);
		border-radius: 999px;
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--mood-ink);
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--mood);
		box-shadow: 0 0 0 3px var(--mood-soft);
		animation: dot-pulse 2.4s var(--ease-in-out) infinite;
	}

	.num-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 18px;
		align-items: center;
		padding: 12px 0;
		border-top: 1px solid var(--color-border-subtle);
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.num {
		font-size: clamp(96px, 24vw, 132px);
		line-height: 0.9;
		letter-spacing: -0.045em;
		font-variation-settings:
			'opsz' 144,
			'SOFT' 80,
			'wght' 460;
		color: transparent;
		background: linear-gradient(
			180deg,
			var(--mood-ink) 0%,
			var(--mood) 100%
		);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.rule {
		width: 56px;
		height: 56px;
		color: var(--mood);
		opacity: 0.7;
	}

	.rule svg {
		width: 100%;
		height: 100%;
	}

	.msg {
		margin: 16px 0 6px;
		font-size: clamp(28px, 5vw, 34px);
		line-height: 1.05;
		font-variation-settings:
			'opsz' 60,
			'SOFT' 100,
			'wght' 460,
			'ital' 0;
		color: var(--color-text-primary);
	}

	.sub {
		margin: 0 0 18px;
		font-size: 14.5px;
		line-height: 1.55;
		color: var(--color-text-muted);
	}

	.quote {
		position: relative;
		margin: 0 0 22px;
		padding: 14px 16px 14px 32px;
		background: var(--ember-tint-bg);
		border-left: 2px solid var(--mood);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
		font-family: var(--font-display);
		font-size: 14px;
		line-height: 1.5;
		color: var(--color-text-muted);
	}

	.qopen {
		position: absolute;
		left: 8px;
		top: 4px;
		font-family: var(--font-display);
		font-size: 38px;
		line-height: 1;
		color: var(--mood);
		opacity: 0.55;
		font-variation-settings:
			'opsz' 144,
			'SOFT' 100,
			'wght' 460;
	}

	.actions {
		display: flex;
		gap: 8px;
	}

	.primary {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 11px 16px;
		border-radius: var(--radius-md);
		background: var(--mood-ink);
		color: var(--color-surface-1);
		font-size: 14px;
		font-weight: 500;
		letter-spacing: -0.005em;
		transition: transform var(--duration-fast) var(--ease-out);
	}

	.primary svg {
		width: 14px;
		height: 14px;
		transition: transform var(--duration-fast) var(--ease-out);
	}

	.primary:hover {
		transform: translateY(-1px);
	}

	.primary:hover svg {
		transform: translateX(2px);
	}

	.ghost {
		padding: 11px 16px;
		border: 1px solid var(--ember-line);
		background: transparent;
		border-radius: var(--radius-md);
		color: var(--mood-ink);
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-out);
	}

	.ghost:hover {
		background: var(--ember-tint-bg);
	}

	.head,
	.num-row,
	.msg,
	.sub,
	.quote,
	.actions {
		opacity: 0;
		animation: rise 600ms var(--ease-out) both;
	}
	.head {
		animation-delay: 80ms;
	}
	.num-row {
		animation-delay: 160ms;
	}
	.msg {
		animation-delay: 280ms;
	}
	.sub {
		animation-delay: 340ms;
	}
	.quote {
		animation-delay: 420ms;
	}
	.actions {
		animation-delay: 500ms;
	}

	@keyframes card-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@keyframes dot-pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.45;
			transform: scale(0.75);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tablet,
		.head,
		.num-row,
		.msg,
		.sub,
		.quote,
		.actions,
		.dot {
			animation: none;
			opacity: 1;
		}
	}
</style>
