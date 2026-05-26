<script lang="ts">
	import { page } from '$app/state';
	import { userMessage } from '@nexo/errors';
	import { m } from '$lib/paraglide/messages.js';

	const code = $derived(page.error?.code ?? null);
	const msg = $derived(
		code ? userMessage(code) : (page.error?.message ?? m.error_default_message())
	);
	const correlationId = $derived(page.error?.correlationId ?? null);
	const status = $derived(page.status);
	const mood = $derived(status === 404 ? 'missing' : 'declined');

	let copied = $state(false);
	async function copyId() {
		if (!correlationId) return;
		await navigator.clipboard.writeText(correlationId);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<main class="sys" data-mood={mood}>
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
				transaction · {mood}
			</span>
		</header>

		<div class="ledger">
			<div class="row row-header">
				<span>entry</span>
				<span>status</span>
			</div>
			<div class="row">
				<span class="entry mono">{page.url.pathname}</span>
				<span class="badge">{status}</span>
			</div>
		</div>

		<h1 class="msg">{msg}</h1>

		{#if correlationId}
			<div class="receipt">
				<span class="stamp" aria-hidden="true">
					<svg viewBox="0 0 56 56" fill="none">
						<circle cx="28" cy="28" r="25" stroke="currentColor" stroke-width="1.5" />
						<circle
							cx="28"
							cy="28"
							r="20"
							stroke="currentColor"
							stroke-width="1"
							stroke-dasharray="2 3"
						/>
						<text
							x="28"
							y="22"
							text-anchor="middle"
							font-family="ui-monospace, monospace"
							font-size="6"
							font-weight="700"
							letter-spacing="0.6"
							fill="currentColor"
						>NEXO</text>
						<text
							x="28"
							y="32"
							text-anchor="middle"
							font-family="ui-monospace, monospace"
							font-size="5"
							font-weight="500"
							letter-spacing="0.4"
							fill="currentColor"
						>FAILED</text>
						<text
							x="28"
							y="40"
							text-anchor="middle"
							font-family="ui-monospace, monospace"
							font-size="4"
							font-weight="500"
							fill="currentColor"
						>FINANCE</text>
					</svg>
				</span>
				<div class="receipt-body">
					<div class="receipt-head">
						<span>{m.error_ref()}</span>
						<button type="button" class="copy" onclick={copyId} aria-live="polite">
							{copied ? m.copied() : m.copy()}
						</button>
					</div>
					<code class="receipt-id">{correlationId}</code>
				</div>
			</div>
		{/if}

		<footer class="foot">
			<a href="/" class="primary">
				<span>{m.error_go_home()}</span>
				<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
					<path d="M4 8h8M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</a>
			<button type="button" class="ghost" onclick={() => window.location.reload()}>
				retry
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
	}

	.sys[data-mood='missing'] {
		--mood: var(--color-accent);
		--mood-soft: color-mix(in oklab, var(--color-accent) 16%, transparent);
		--mood-ink: color-mix(in oklab, var(--color-accent) 78%, #000);
	}
	.sys[data-mood='declined'] {
		--mood: #b91c1c;
		--mood-soft: rgb(185 28 28 / 0.14);
		--mood-ink: #7f1d1d;
	}

	/* Subtle ledger ruling underlay + radial mood wash */
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
		max-width: 420px;
		padding: 26px 26px 22px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: 4px;
		box-shadow:
			0 1px 0 rgb(255 255 255 / 0.6) inset,
			0 14px 44px -18px rgb(10 10 10 / 0.14),
			0 4px 12px -6px rgb(10 10 10 / 0.06);
		animation: card-in 600ms var(--ease-out) both;
	}

	/* Perforated edges — top and bottom */
	.slip-perf {
		position: absolute;
		left: 0;
		right: 0;
		height: 8px;
		background:
			radial-gradient(circle at 8px 4px, var(--color-bg-0) 3px, transparent 3.5px) repeat-x;
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

	.ledger {
		margin: 18px 0 18px;
		font-family: var(--font-mono);
		font-size: 11px;
	}

	.row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 12px;
		align-items: center;
		padding: 9px 0;
		border-bottom: 1px dashed var(--color-border-subtle);
	}

	.row:last-child {
		border-bottom: 0;
	}

	.row-header {
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-text-faint);
		padding: 4px 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.entry {
		font-size: 12px;
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.badge {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
		font-size: 13px;
		font-weight: 700;
		padding: 4px 10px;
		border-radius: 999px;
		background: var(--mood-soft);
		color: var(--mood-ink);
		letter-spacing: 0.04em;
	}

	.msg {
		margin: 0 0 18px;
		font-size: 22px;
		font-weight: 600;
		line-height: 1.25;
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

	.receipt {
		display: grid;
		grid-template-columns: 56px 1fr;
		gap: 14px;
		align-items: center;
		padding: 12px 14px;
		background: var(--color-bg-1);
		border-radius: 4px;
		border: 1px dashed var(--color-border-default);
	}

	.stamp {
		display: grid;
		place-items: center;
		color: var(--mood-ink);
		opacity: 0.85;
		transform: rotate(-9deg);
	}

	.stamp svg {
		width: 56px;
		height: 56px;
	}

	.receipt-body {
		min-width: 0;
	}

	.receipt-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-family: var(--font-mono);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-text-faint);
		margin-bottom: 4px;
	}

	.copy {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 2px 6px;
		border: 0;
		border-radius: var(--radius-xs);
		background: transparent;
		color: var(--color-accent);
		cursor: pointer;
	}

	.copy:hover {
		background: color-mix(in oklab, var(--color-accent) 10%, transparent);
	}

	.receipt-id {
		display: block;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--color-text-primary);
		word-break: break-all;
		font-variant-numeric: tabular-nums;
	}

	.foot {
		display: flex;
		gap: 8px;
		margin-top: 18px;
	}

	.primary {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 10px 16px;
		border-radius: var(--radius-md);
		background: var(--color-text-primary);
		color: var(--color-surface-1);
		font-size: 13px;
		font-weight: 600;
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
		border: 1px solid var(--color-border-default);
		background: var(--color-surface-1);
		border-radius: var(--radius-md);
		color: var(--color-text-muted);
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-out);
	}

	.ghost:hover {
		background: var(--color-bg-1);
		color: var(--color-text-primary);
	}

	.head,
	.ledger,
	.msg,
	.receipt,
	.foot {
		opacity: 0;
		animation: rise 600ms var(--ease-out) both;
	}
	.head {
		animation-delay: 80ms;
	}
	.ledger {
		animation-delay: 160ms;
	}
	.msg {
		animation-delay: 240ms;
	}
	.receipt {
		animation-delay: 320ms;
	}
	.foot {
		animation-delay: 400ms;
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
		.slip,
		.head,
		.ledger,
		.msg,
		.receipt,
		.foot,
		.dot {
			animation: none;
			opacity: 1;
		}
	}
</style>
