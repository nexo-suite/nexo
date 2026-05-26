<script lang="ts">
	import { page } from '$app/state';

	const status = $derived(page.status);
	const isMissing = $derived(status === 404);
	const heading = $derived(isMissing ? 'Page not found' : 'Something went wrong');
	const sub = $derived(
		isMissing
			? "This page doesn't exist. Maybe it never did."
			: "That wasn't supposed to happen. Try again or head home."
	);
</script>

<svelte:head>
	<title>{status} — Nexo</title>
</svelte:head>

<main class="sys" data-mood={isMissing ? 'missing' : 'fault'}>
	<div class="sys-bg" aria-hidden="true"></div>

	<section class="card">
		<header class="head">
			<a href="/" class="brand">
				<img src="/favicon.svg" alt="" />
				<span>Nexo</span>
			</a>
			<span class="eyebrow">
				<span class="dot" aria-hidden="true"></span>
				error · {String(status).padStart(3, '0')}
			</span>
		</header>

		<div class="num-wrap" aria-hidden="true">
			<svg class="num-grid" viewBox="0 0 400 200" preserveAspectRatio="none" fill="none">
				<defs>
					<pattern id="cross" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
						<path d="M9 10h2M10 9v2" stroke="currentColor" stroke-width="0.6" />
					</pattern>
				</defs>
				<rect width="400" height="200" fill="url(#cross)" />
			</svg>
			<span class="num">{status}</span>
		</div>

		<h1 class="msg">{heading}</h1>
		<p class="sub">{sub}</p>

		<div class="actions">
			<a href="/" class="primary">
				<span>Back to home</span>
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
					<path d="M4 8h8M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</a>
			<a href="mailto:hello@krieger2501.de" class="ghost">Contact owner</a>
		</div>

		<footer class="foot">
			<span>krieger2501.de</span>
			<span class="sep" aria-hidden="true">·</span>
			<span class="mono">err.{String(status).padStart(3, '0')}</span>
		</footer>
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
		--mood: var(--color-accent);
		--mood-soft: color-mix(in oklab, var(--color-accent) 14%, transparent);
	}
	.sys[data-mood='fault'] {
		--mood: #ef4444;
		--mood-soft: rgb(239 68 68 / 0.14);
	}

	.sys-bg {
		position: absolute;
		inset: 0;
		z-index: -1;
		background:
			radial-gradient(ellipse 80% 60% at 50% 0%, var(--mood-soft), transparent 60%),
			linear-gradient(to right, rgb(10 10 10 / 0.045) 1px, transparent 1px) 0 0 / 56px 56px,
			linear-gradient(to bottom, rgb(10 10 10 / 0.045) 1px, transparent 1px) 0 0 / 56px 56px,
			var(--color-bg-0);
		mask-image: radial-gradient(ellipse 90% 80% at 50% 30%, #000 0%, #000 50%, transparent 100%);
	}

	.card {
		position: relative;
		width: 100%;
		max-width: 440px;
		padding: 28px 32px 24px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-2xl);
		box-shadow:
			0 1px 0 rgb(255 255 255 / 0.6) inset,
			0 16px 48px -20px rgb(10 10 10 / 0.16),
			0 4px 12px -6px rgb(10 10 10 / 0.06);
		animation: card-in 600ms var(--ease-out) both;
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-bottom: 20px;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--color-text-primary);
	}

	.brand img {
		width: 18px;
		height: 18px;
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 5px 11px;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-default);
		border-radius: 999px;
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--mood);
		box-shadow: 0 0 0 3px var(--mood-soft);
		animation: dot-pulse 2.4s var(--ease-in-out) infinite;
	}

	.num-wrap {
		position: relative;
		height: clamp(140px, 22vw, 200px);
		display: grid;
		place-items: center;
		margin-bottom: 12px;
		overflow: hidden;
		border-radius: var(--radius-lg);
		background: linear-gradient(
			180deg,
			var(--color-bg-1) 0%,
			var(--color-surface-1) 100%
		);
	}

	.num-grid {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		color: var(--color-text-faint);
		opacity: 0.6;
	}

	.num {
		position: relative;
		font-size: clamp(120px, 22vw, 168px);
		font-weight: 600;
		line-height: 1;
		letter-spacing: -0.06em;
		font-variant-numeric: tabular-nums;
		color: transparent;
		background: linear-gradient(
			175deg,
			var(--color-text-primary) 0%,
			color-mix(in oklab, var(--color-text-primary) 30%, var(--color-bg-1)) 100%
		);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.msg {
		margin: 18px 0 6px;
		font-size: clamp(24px, 4vw, 30px);
		font-weight: 600;
		line-height: 1.1;
		letter-spacing: -0.025em;
		color: var(--color-text-primary);
	}

	.sub {
		margin: 0 0 20px;
		font-size: 15px;
		line-height: 1.55;
		color: var(--color-text-muted);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}

	.primary {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 18px;
		background: var(--color-text-primary);
		color: var(--color-surface-1);
		border-radius: var(--radius-md);
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
		padding: 10px 14px;
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-muted);
		border-radius: var(--radius-md);
	}

	.ghost:hover {
		color: var(--color-accent);
	}

	.foot {
		display: flex;
		gap: 8px;
		align-items: center;
		margin-top: 22px;
		padding-top: 16px;
		border-top: 1px dashed var(--color-border-subtle);
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--color-text-faint);
	}

	.sep {
		opacity: 0.6;
	}

	.mono {
		text-transform: lowercase;
		font-feature-settings: 'tnum' 1;
	}

	.head,
	.num-wrap,
	.msg,
	.sub,
	.actions,
	.foot {
		opacity: 0;
		animation: rise 600ms var(--ease-out) both;
	}
	.head {
		animation-delay: 80ms;
	}
	.num-wrap {
		animation-delay: 160ms;
	}
	.msg {
		animation-delay: 280ms;
	}
	.sub {
		animation-delay: 340ms;
	}
	.actions {
		animation-delay: 420ms;
	}
	.foot {
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
		.card,
		.head,
		.num-wrap,
		.msg,
		.sub,
		.actions,
		.foot,
		.dot {
			animation: none;
			opacity: 1;
		}
	}
</style>
