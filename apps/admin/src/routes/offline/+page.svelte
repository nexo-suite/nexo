<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	const timestamp = $derived(
		new Date().toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		})
	);
</script>

<svelte:head>
	<title>{m.offline_title()}</title>
</svelte:head>

<main class="sys">
	<div class="sys-bg" aria-hidden="true"></div>

	<section class="card">
		<span class="reg reg-tl" aria-hidden="true"></span>
		<span class="reg reg-tr" aria-hidden="true"></span>
		<span class="reg reg-bl" aria-hidden="true"></span>
		<span class="reg reg-br" aria-hidden="true"></span>

		<header class="head">
			<span class="brand">
				<img src="/favicon.svg" alt="" />
				<span>Nexo · admin</span>
			</span>
			<span class="eyebrow">
				<span class="dot" aria-hidden="true"></span>
				signal · lost
			</span>
		</header>

		<div class="signal" aria-hidden="true">
			<svg viewBox="0 0 120 120" fill="none">
				<circle class="ring r3" cx="60" cy="60" r="52" stroke="currentColor" stroke-width="1" />
				<circle class="ring r2" cx="60" cy="60" r="38" stroke="currentColor" stroke-width="1" />
				<circle class="ring r1" cx="60" cy="60" r="22" stroke="currentColor" stroke-width="1" />
				<line
					class="strike"
					x1="20"
					y1="20"
					x2="100"
					y2="100"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
				/>
				<circle cx="60" cy="60" r="5" fill="currentColor" />
			</svg>
		</div>

		<h1 class="msg">{m.offline_heading()}</h1>
		<p class="sub">{m.offline_sub()}</p>

		<div class="meta">
			<span class="mlbl">last attempt</span>
			<span class="mval mono">{timestamp}</span>
			<span class="mlbl">connection</span>
			<span class="mval">offline</span>
		</div>

		<footer class="foot">
			<button type="button" class="primary" onclick={() => window.location.reload()}>
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
					<path
						d="M14 2v4h-4M2 14v-4h4M13 6a6 6 0 0 0-10.5-2M3 10a6 6 0 0 0 10.5 2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>
				<span>{m.offline_retry()}</span>
			</button>
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
		--mood: #f59e0b;
		--mood-soft: rgb(245 158 11 / 0.16);
	}

	.sys-bg {
		position: absolute;
		inset: 0;
		z-index: -1;
		background:
			radial-gradient(ellipse 70% 55% at 50% -10%, var(--mood-soft), transparent 60%),
			linear-gradient(to right, rgb(10 10 10 / 0.05) 1px, transparent 1px) 0 0 / 32px 32px,
			linear-gradient(to bottom, rgb(10 10 10 / 0.05) 1px, transparent 1px) 0 0 / 32px 32px,
			var(--color-bg-0);
		mask-image: radial-gradient(ellipse 80% 70% at 50% 30%, #000 0%, #000 50%, transparent 100%);
	}

	.card {
		position: relative;
		width: 100%;
		max-width: 380px;
		padding: 22px 24px 18px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		text-align: center;
		box-shadow:
			0 1px 0 rgb(255 255 255 / 0.6) inset,
			0 14px 44px -18px rgb(10 10 10 / 0.14),
			0 4px 12px -6px rgb(10 10 10 / 0.06);
		animation: card-in 600ms var(--ease-out) both;
	}

	.reg {
		position: absolute;
		width: 8px;
		height: 8px;
		opacity: 0.5;
	}
	.reg::before,
	.reg::after {
		content: '';
		position: absolute;
		background: var(--color-text-faint);
	}
	.reg::before {
		left: 50%;
		top: 0;
		bottom: 0;
		width: 1px;
		transform: translateX(-0.5px);
	}
	.reg::after {
		top: 50%;
		left: 0;
		right: 0;
		height: 1px;
		transform: translateY(-0.5px);
	}
	.reg-tl {
		top: 8px;
		left: 8px;
	}
	.reg-tr {
		top: 8px;
		right: 8px;
	}
	.reg-bl {
		bottom: 8px;
		left: 8px;
	}
	.reg-br {
		bottom: 8px;
		right: 8px;
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 0 4px 14px;
		border-bottom: 1px dashed var(--color-border-subtle);
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 12px;
		font-weight: 600;
	}
	.brand img {
		width: 16px;
		height: 16px;
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 7px;
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

	.signal {
		margin: 28px auto 18px;
		width: 110px;
		height: 110px;
		color: var(--mood);
	}

	.signal svg {
		width: 100%;
		height: 100%;
	}

	.ring {
		transform-origin: 60px 60px;
		opacity: 0;
		animation: ring-out 2.6s var(--ease-out) infinite;
	}
	.ring.r1 {
		animation-delay: 0s;
	}
	.ring.r2 {
		animation-delay: 0.4s;
	}
	.ring.r3 {
		animation-delay: 0.8s;
	}

	.strike {
		stroke: color-mix(in oklab, var(--mood) 80%, #000);
		opacity: 0.85;
	}

	.msg {
		margin: 0 0 6px;
		font-size: 22px;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: transparent;
		background: linear-gradient(
			175deg,
			var(--color-text-primary) 0%,
			color-mix(in oklab, var(--color-text-primary) 55%, var(--color-bg-0)) 100%
		);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.sub {
		margin: 0 0 18px;
		font-size: 13px;
		line-height: 1.5;
		color: var(--color-text-muted);
	}

	.meta {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 4px 12px;
		padding: 10px 12px;
		background: var(--color-bg-1);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-subtle);
		font-family: var(--font-mono);
		font-size: 11px;
		text-align: left;
	}

	.mlbl {
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-text-faint);
	}

	.mval {
		color: var(--color-text-primary);
		font-weight: 500;
	}

	.mval.mono {
		font-variant-numeric: tabular-nums;
	}

	.foot {
		margin-top: 16px;
		padding-top: 14px;
		border-top: 1px dashed var(--color-border-subtle);
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
		background: var(--color-text-primary);
		color: var(--color-surface-1);
		font-size: 13px;
		font-weight: 600;
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
	.signal,
	.msg,
	.sub,
	.meta,
	.foot {
		opacity: 0;
		animation: rise 600ms var(--ease-out) both;
	}
	.head {
		animation-delay: 80ms;
	}
	.signal {
		animation-delay: 160ms;
	}
	.msg {
		animation-delay: 240ms;
	}
	.sub {
		animation-delay: 300ms;
	}
	.meta {
		animation-delay: 360ms;
	}
	.foot {
		animation-delay: 440ms;
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
	@keyframes ring-out {
		0% {
			transform: scale(0.4);
			opacity: 0;
		}
		20% {
			opacity: 0.6;
		}
		100% {
			transform: scale(1);
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
		.signal,
		.msg,
		.sub,
		.meta,
		.foot,
		.dot,
		.ring {
			animation: none;
			opacity: 1;
		}
	}
</style>
