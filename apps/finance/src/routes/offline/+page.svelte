<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{m.offline_title()}</title>
</svelte:head>

<main class="sys">
	<div class="sys-bg" aria-hidden="true"></div>

	<section class="slip">
		<div class="slip-perf slip-perf-top" aria-hidden="true"></div>

		<header class="head">
			<span class="brand">
				<img src="/favicon.svg" alt="" />
				<span>Nexo · finance</span>
			</span>
			<span class="eyebrow">
				<span class="dot" aria-hidden="true"></span>
				ledger · paused
			</span>
		</header>

		<div class="totem" aria-hidden="true">
			<svg viewBox="0 0 80 80" fill="none">
				<rect
					x="6"
					y="14"
					width="68"
					height="52"
					rx="4"
					stroke="currentColor"
					stroke-width="1.4"
				/>
				<line
					x1="6"
					y1="26"
					x2="74"
					y2="26"
					stroke="currentColor"
					stroke-width="1.2"
				/>
				<line
					x1="14"
					y1="36"
					x2="38"
					y2="36"
					stroke="currentColor"
					stroke-width="1"
					stroke-dasharray="2 2"
				/>
				<line
					x1="14"
					y1="46"
					x2="50"
					y2="46"
					stroke="currentColor"
					stroke-width="1"
					stroke-dasharray="2 2"
				/>
				<line
					x1="14"
					y1="56"
					x2="34"
					y2="56"
					stroke="currentColor"
					stroke-width="1"
					stroke-dasharray="2 2"
				/>
				<g class="strike">
					<line
						x1="58"
						y1="40"
						x2="68"
						y2="50"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
					<line
						x1="68"
						y1="40"
						x2="58"
						y2="50"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</g>
			</svg>
		</div>

		<h1 class="msg">{m.offline_heading()}</h1>
		<p class="sub">{m.offline_sub()}</p>

		<div class="meta">
			<span class="mlbl">connection</span>
			<span class="mval">offline</span>
			<span class="mlbl">queued writes</span>
			<span class="mval mono">0</span>
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

		<div class="slip-perf slip-perf-bot" aria-hidden="true"></div>
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
			repeating-linear-gradient(
				to bottom,
				transparent 0,
				transparent 27px,
				rgb(10 10 10 / 0.04) 27px,
				rgb(10 10 10 / 0.04) 28px
			),
			var(--color-bg-0);
		mask-image: radial-gradient(ellipse 80% 70% at 50% 30%, #000 0%, #000 50%, transparent 100%);
	}

	.slip {
		position: relative;
		width: 100%;
		max-width: 380px;
		padding: 26px 26px 22px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: 4px;
		text-align: center;
		box-shadow:
			0 1px 0 rgb(255 255 255 / 0.6) inset,
			0 14px 44px -18px rgb(10 10 10 / 0.14),
			0 4px 12px -6px rgb(10 10 10 / 0.06);
		animation: card-in 600ms var(--ease-out) both;
	}

	.slip-perf {
		position: absolute;
		left: 0;
		right: 0;
		height: 8px;
		background: radial-gradient(circle at 8px 4px, var(--color-bg-0) 3px, transparent 3.5px) repeat-x;
		background-size: 16px 8px;
	}
	.slip-perf-top {
		top: -4px;
	}
	.slip-perf-bot {
		bottom: -4px;
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding-bottom: 14px;
		border-bottom: 1px dashed var(--color-border-default);
		text-align: left;
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

	.totem {
		margin: 22px auto 14px;
		width: 80px;
		height: 80px;
		color: var(--color-text-faint);
	}

	.totem svg {
		width: 100%;
		height: 100%;
	}

	.totem .strike {
		color: var(--mood);
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
		border-radius: 4px;
		border: 1px dashed var(--color-border-default);
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
	.totem,
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
	.totem {
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
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(-360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.slip,
		.head,
		.totem,
		.msg,
		.sub,
		.meta,
		.foot,
		.dot {
			animation: none;
			opacity: 1;
		}
	}
</style>
