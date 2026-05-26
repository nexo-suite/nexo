<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { userMessage } from '@nexo/errors';

	const status = $derived(page.status);
	const code = $derived(page.error?.message);
	const friendly = $derived(code ? userMessage(code) : null);
	const heading = $derived(
		status === 404 ? 'Lost the bottle.' : 'Something tipped over.'
	);
</script>

<svelte:head>
	<title>Error · Flaschen</title>
</svelte:head>

<main class="sys">
	<div class="sys-bg" aria-hidden="true"></div>
	<div class="sys-glow" aria-hidden="true"></div>

	<section class="card">
		<header class="head">
			<span class="brand">Flaschen</span>
			<span class="eyebrow">
				<span class="dot" aria-hidden="true"></span>
				error · {status}
			</span>
		</header>

		<div class="status-cluster">
			<span class="big numeral" aria-hidden="true">{status}</span>
			<svg class="bottle" viewBox="0 0 80 120" fill="none" aria-hidden="true">
				<path
					d="M30 4h20v18a16 16 0 0 0 4 10l8 12a26 26 0 0 1 4 14v44a14 14 0 0 1-14 14H28a14 14 0 0 1-14-14V58a26 26 0 0 1 4-14l8-12a16 16 0 0 0 4-10V4z"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linejoin="round"
				/>
				<line
					x1="20"
					y1="76"
					x2="60"
					y2="76"
					stroke="currentColor"
					stroke-width="1"
					stroke-dasharray="2 3"
					opacity="0.4"
				/>
				<g class="splash">
					<circle cx="62" cy="22" r="2" fill="currentColor" opacity="0.6" />
					<circle cx="68" cy="32" r="1.4" fill="currentColor" opacity="0.5" />
					<circle cx="58" cy="36" r="1" fill="currentColor" opacity="0.4" />
				</g>
			</svg>
		</div>

		<h1 class="msg">{heading}</h1>
		<p class="sub">{friendly ?? code ?? "Couldn't reach the shelf. Try again or head back home."}</p>

		<a href="/" class="primary">
			<span>{m.nav_home()}</span>
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
				<path d="M4 8h8M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</a>
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

	/* Pastel wash mosaic — Flaschen signature */
	.sys-bg {
		position: absolute;
		inset: 0;
		z-index: -2;
		background:
			radial-gradient(circle at 12% 20%, var(--color-wash-rose), transparent 38%),
			radial-gradient(circle at 88% 30%, var(--color-wash-peach), transparent 42%),
			radial-gradient(circle at 50% 95%, var(--color-wash-lilac), transparent 50%),
			var(--color-bg-0);
	}

	.sys-glow {
		position: absolute;
		inset: 0;
		z-index: -1;
		background: radial-gradient(
			ellipse 60% 50% at 50% 18%,
			color-mix(in oklab, var(--accent) 18%, transparent),
			transparent 60%
		);
	}

	.card {
		position: relative;
		width: 100%;
		max-width: 380px;
		padding: 28px 28px 24px;
		background: rgb(255 255 255 / 0.78);
		backdrop-filter: blur(18px) saturate(140%);
		-webkit-backdrop-filter: blur(18px) saturate(140%);
		border: 1px solid rgb(255 255 255 / 0.6);
		border-radius: var(--radius-2xl);
		text-align: center;
		box-shadow:
			0 1px 0 rgb(255 255 255 / 0.8) inset,
			0 0 0 1px var(--color-border-subtle),
			0 24px 48px -20px rgb(124 18 64 / 0.18),
			0 8px 18px -8px rgb(124 18 64 / 0.08);
		animation: card-in 700ms var(--ease-soft) both;
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	.brand {
		font-family: var(--font-display);
		font-size: 18px;
		font-weight: 500;
		font-style: italic;
		letter-spacing: -0.01em;
		color: var(--accent-ink);
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 5px 11px;
		background: rgb(255 255 255 / 0.7);
		border: 1px solid var(--color-border-subtle);
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
		background: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 18%, transparent);
		animation: dot-pulse 2.4s var(--ease-soft) infinite;
	}

	.status-cluster {
		position: relative;
		display: grid;
		place-items: center;
		margin: 24px 0 18px;
	}

	.big {
		font-family: var(--font-display);
		font-size: clamp(120px, 30vw, 168px);
		font-weight: 400;
		font-style: italic;
		line-height: 0.9;
		letter-spacing: -0.04em;
		color: transparent;
		background: linear-gradient(
			180deg,
			var(--accent) 0%,
			var(--accent-deep) 100%
		);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		font-variant-numeric: tabular-nums;
	}

	.bottle {
		position: absolute;
		right: -12px;
		bottom: -8px;
		width: 64px;
		height: 96px;
		color: var(--accent-deep);
		opacity: 0.55;
		transform: rotate(18deg);
		animation: bottle-tilt 6s var(--ease-soft) infinite;
	}

	.bottle .splash {
		animation: splash 6s var(--ease-soft) infinite;
		transform-origin: 60px 24px;
	}

	.msg {
		margin: 0 0 6px;
		font-family: var(--font-display);
		font-size: 28px;
		font-weight: 400;
		font-style: italic;
		line-height: 1.1;
		letter-spacing: -0.02em;
		color: var(--color-text-primary);
	}

	.sub {
		margin: 0 0 22px;
		font-size: 14px;
		line-height: 1.55;
		color: var(--color-text-muted);
	}

	.primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 11px 22px;
		border-radius: 999px;
		background: linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%);
		color: #fff;
		font-size: 14px;
		font-weight: 600;
		letter-spacing: -0.005em;
		box-shadow:
			0 1px 0 rgb(255 255 255 / 0.18) inset,
			0 6px 14px -4px color-mix(in oklab, var(--accent) 50%, transparent);
		transition:
			transform 200ms var(--ease-spring),
			box-shadow 200ms var(--ease-soft);
	}

	.primary svg {
		width: 14px;
		height: 14px;
		transition: transform 200ms var(--ease-spring);
	}

	.primary:hover {
		transform: translateY(-1px) scale(1.02);
	}

	.primary:hover svg {
		transform: translateX(3px);
	}

	.primary:active {
		transform: translateY(0) scale(0.98);
	}

	.head,
	.status-cluster,
	.msg,
	.sub,
	.primary {
		opacity: 0;
		animation: rise 700ms var(--ease-soft) both;
	}
	.head {
		animation-delay: 80ms;
	}
	.status-cluster {
		animation-delay: 160ms;
	}
	.msg {
		animation-delay: 280ms;
	}
	.sub {
		animation-delay: 360ms;
	}
	.primary {
		animation-delay: 440ms;
	}

	@keyframes card-in {
		from {
			opacity: 0;
			transform: translateY(12px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(8px);
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
	@keyframes bottle-tilt {
		0%,
		100% {
			transform: rotate(18deg);
		}
		50% {
			transform: rotate(26deg);
		}
	}
	@keyframes splash {
		0%,
		40%,
		100% {
			opacity: 0;
			transform: translate(0, 0);
		}
		50% {
			opacity: 1;
			transform: translate(2px, -4px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.card,
		.head,
		.status-cluster,
		.msg,
		.sub,
		.primary,
		.dot,
		.bottle,
		.bottle .splash {
			animation: none;
			opacity: 1;
		}
	}
</style>
