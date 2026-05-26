<svelte:head>
	<title>Offline — Calorie</title>
</svelte:head>

<main class="sys">
	<div class="sys-wash" aria-hidden="true"></div>
	<div class="sys-grid" aria-hidden="true"></div>

	<section class="tablet">
		<header class="head">
			<span class="brand serif-italic">Calorie</span>
			<span class="eyebrow">
				<span class="dot" aria-hidden="true"></span>
				log · paused
			</span>
		</header>

		<div class="hearth" aria-hidden="true">
			<svg viewBox="0 0 100 100" fill="none">
				<circle
					cx="50"
					cy="50"
					r="44"
					stroke="currentColor"
					stroke-width="0.8"
					stroke-dasharray="2 4"
					opacity="0.4"
				/>
				<circle
					cx="50"
					cy="50"
					r="32"
					stroke="currentColor"
					stroke-width="0.8"
					opacity="0.55"
				/>
				<g class="flame">
					<path
						d="M50 32c-4 6-9 10-9 18a9 9 0 0 0 18 0c0-5-2-7-3-10-1 3-2 4-3 4 0-5-2-9-3-12z"
						stroke="currentColor"
						stroke-width="1.4"
						stroke-linejoin="round"
						fill="none"
					/>
				</g>
				<line
					x1="36"
					y1="68"
					x2="64"
					y2="68"
					stroke="currentColor"
					stroke-width="1"
					stroke-linecap="round"
					opacity="0.6"
				/>
			</svg>
		</div>

		<h1 class="msg serif-display">Quiet kitchen.</h1>
		<p class="sub">
			You're offline, but your log is safe on this device. Entries saved here will sync when the
			signal returns.
		</p>

		<blockquote class="quote">
			<span class="qopen" aria-hidden="true">&ldquo;</span>
			<span class="serif-italic">Patience is the secret ingredient.</span>
		</blockquote>

		<button type="button" class="primary" onclick={() => window.location.reload()}>
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
				<path
					d="M14 2v4h-4M2 14v-4h4M13 6a6 6 0 0 0-10.5-2M3 10a6 6 0 0 0 10.5 2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			<span>Try again</span>
		</button>
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
		--mood: var(--color-ember);
		--mood-soft: color-mix(in oklab, var(--color-ember) 14%, transparent);
		--mood-ink: var(--color-ember-deep);
	}

	.sys-wash {
		position: absolute;
		inset: 0;
		z-index: -2;
		background:
			radial-gradient(circle at 18% 12%, var(--color-ember-tint), transparent 42%),
			radial-gradient(
				circle at 88% 84%,
				color-mix(in oklab, var(--color-ember-glow) 50%, transparent),
				transparent 52%
			),
			var(--color-bg-0);
	}

	.sys-grid {
		position: absolute;
		inset: 0;
		z-index: -1;
		background:
			linear-gradient(
				to right,
				color-mix(in oklab, var(--color-ember) 10%, transparent) 1px,
				transparent 1px
			)
				0 0 / 64px 64px,
			linear-gradient(
				to bottom,
				color-mix(in oklab, var(--color-ember) 10%, transparent) 1px,
				transparent 1px
			)
				0 0 / 64px 64px;
		mask-image: radial-gradient(ellipse 80% 70% at 50% 30%, #000 0%, #000 40%, transparent 100%);
		opacity: 0.5;
	}

	.tablet {
		position: relative;
		width: 100%;
		max-width: 380px;
		padding: 28px 28px 22px;
		background: var(--color-surface-1);
		border: 1px solid var(--ember-line);
		border-radius: var(--radius-2xl);
		text-align: center;
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
		text-align: left;
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

	.hearth {
		margin: 16px auto 14px;
		width: 110px;
		height: 110px;
		color: var(--mood);
	}

	.hearth svg {
		width: 100%;
		height: 100%;
	}

	.flame {
		transform-origin: 50px 60px;
		animation: flicker 2.8s var(--ease-in-out) infinite;
	}

	.msg {
		margin: 0 0 6px;
		font-size: 30px;
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
		text-align: left;
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

	.primary {
		width: 100%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 11px 16px;
		border: 0;
		border-radius: var(--radius-md);
		background: var(--mood-ink);
		color: var(--color-surface-1);
		font-size: 14px;
		font-weight: 500;
		letter-spacing: -0.005em;
		cursor: pointer;
		transition: transform var(--duration-fast) var(--ease-out);
	}

	.primary svg {
		width: 14px;
		height: 14px;
	}

	.primary:hover {
		transform: translateY(-1px);
	}

	.primary:hover svg {
		animation: spin 600ms var(--ease-out);
	}

	.head,
	.hearth,
	.msg,
	.sub,
	.quote,
	.primary {
		opacity: 0;
		animation: rise 600ms var(--ease-out) both;
	}
	.head {
		animation-delay: 80ms;
	}
	.hearth {
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
	.primary {
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
	@keyframes flicker {
		0%,
		100% {
			transform: scale(1) translateY(0);
			opacity: 1;
		}
		25% {
			transform: scale(0.96) translateY(0.5px);
			opacity: 0.85;
		}
		50% {
			transform: scale(1.04) translateY(-0.5px);
			opacity: 1;
		}
		75% {
			transform: scale(0.98) translateY(0.5px);
			opacity: 0.9;
		}
	}
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(-360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.tablet,
		.head,
		.hearth,
		.msg,
		.sub,
		.quote,
		.primary,
		.dot,
		.flame {
			animation: none;
			opacity: 1;
		}
	}
</style>
