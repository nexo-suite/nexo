<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>Offline · Flaschen</title>
</svelte:head>

<main class="sys">
	<div class="sys-bg" aria-hidden="true"></div>
	<div class="sys-glow" aria-hidden="true"></div>

	<section class="card">
		<header class="head">
			<span class="brand">Flaschen</span>
			<span class="eyebrow">
				<span class="dot" aria-hidden="true"></span>
				offline
			</span>
		</header>

		<div class="orbit" aria-hidden="true">
			<svg viewBox="0 0 140 140" fill="none">
				<circle
					cx="70"
					cy="70"
					r="60"
					stroke="currentColor"
					stroke-width="1"
					stroke-dasharray="3 4"
					opacity="0.3"
				/>
				<circle
					cx="70"
					cy="70"
					r="42"
					stroke="currentColor"
					stroke-width="1"
					opacity="0.5"
				/>
				<circle class="ping p1" cx="70" cy="70" r="20" stroke="currentColor" stroke-width="1.4" />
				<circle class="ping p2" cx="70" cy="70" r="20" stroke="currentColor" stroke-width="1.4" />
				<circle cx="70" cy="70" r="6" fill="currentColor" />
			</svg>
		</div>

		<h1 class="msg">No connection.</h1>
		<p class="sub">
			Your shifts are still being watched. We'll catch up the moment you reconnect.
		</p>

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

		<a href="/" class="ghost">{m.nav_home()}</a>
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

	.sys-bg {
		position: absolute;
		inset: 0;
		z-index: -2;
		background:
			radial-gradient(circle at 12% 20%, var(--color-wash-rose), transparent 38%),
			radial-gradient(circle at 88% 30%, var(--color-wash-buttercup), transparent 42%),
			radial-gradient(circle at 50% 95%, var(--color-wash-mint), transparent 50%),
			var(--color-bg-0);
	}

	.sys-glow {
		position: absolute;
		inset: 0;
		z-index: -1;
		background: radial-gradient(
			ellipse 60% 50% at 50% 18%,
			color-mix(in oklab, var(--accent) 14%, transparent),
			transparent 60%
		);
	}

	.card {
		position: relative;
		width: 100%;
		max-width: 360px;
		padding: 28px 28px 24px;
		background: rgb(255 255 255 / 0.78);
		backdrop-filter: blur(18px) saturate(140%);
		-webkit-backdrop-filter: blur(18px) saturate(140%);
		border: 1px solid rgb(255 255 255 / 0.6);
		border-radius: var(--radius-2xl);
		text-align: center;
		display: grid;
		gap: 0;
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
		margin-bottom: 12px;
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
		background: #d18602;
		box-shadow: 0 0 0 3px rgb(209 134 2 / 0.18);
		animation: dot-pulse 2.4s var(--ease-soft) infinite;
	}

	.orbit {
		margin: 12px auto 14px;
		width: 130px;
		height: 130px;
		color: var(--accent-deep);
	}

	.orbit svg {
		width: 100%;
		height: 100%;
	}

	.ping {
		transform-origin: 70px 70px;
		opacity: 0;
		animation: ping 2.6s var(--ease-soft) infinite;
	}

	.ping.p2 {
		animation-delay: 1.3s;
	}

	.msg {
		margin: 0 0 6px;
		font-family: var(--font-display);
		font-size: 26px;
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
		border: 0;
		border-radius: 999px;
		background: linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%);
		color: #fff;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		box-shadow:
			0 1px 0 rgb(255 255 255 / 0.18) inset,
			0 6px 14px -4px color-mix(in oklab, var(--accent) 50%, transparent);
		transition: transform 200ms var(--ease-spring);
	}

	.primary svg {
		width: 14px;
		height: 14px;
	}

	.primary:hover {
		transform: translateY(-1px) scale(1.02);
	}

	.primary:hover svg {
		animation: spin 600ms var(--ease-soft);
	}

	.primary:active {
		transform: translateY(0) scale(0.98);
	}

	.ghost {
		display: inline-block;
		margin-top: 12px;
		padding: 4px 12px;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-subtle);
	}

	.ghost:hover {
		color: var(--accent-ink);
	}

	.head,
	.orbit,
	.msg,
	.sub,
	.primary,
	.ghost {
		opacity: 0;
		animation: rise 700ms var(--ease-soft) both;
	}
	.head {
		animation-delay: 80ms;
	}
	.orbit {
		animation-delay: 160ms;
	}
	.msg {
		animation-delay: 280ms;
	}
	.sub {
		animation-delay: 340ms;
	}
	.primary {
		animation-delay: 420ms;
	}
	.ghost {
		animation-delay: 500ms;
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
	@keyframes ping {
		0% {
			transform: scale(0.4);
			opacity: 0;
		}
		20% {
			opacity: 0.7;
		}
		100% {
			transform: scale(2.6);
			opacity: 0;
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
		.card,
		.head,
		.orbit,
		.msg,
		.sub,
		.primary,
		.ghost,
		.dot,
		.ping {
			animation: none;
			opacity: 1;
		}
	}
</style>
