<script lang="ts">
	import { page } from '$app/state';
	import { userMessage } from '@nexo/errors';
	import { m } from '$lib/paraglide/messages.js';

	const code = $derived(page.error?.code ?? null);
	const msg = $derived(code ? userMessage(code) : (page.error?.message ?? m.error_generic()));
	const correlationId = $derived(page.error?.correlationId ?? null);
	const status = $derived(page.status);
	const mood = $derived(status === 404 ? 'missing' : 'fault');

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
				incident · {mood}
			</span>
		</header>

		<div class="status-row">
			<div class="status-num">
				<span aria-hidden="true">{String(status).padStart(3, '0')}</span>
			</div>
			<div class="status-meta">
				<span class="lbl">status</span>
				<span class="val">{mood === 'missing' ? 'not found' : 'unhandled'}</span>
				<span class="lbl">surface</span>
				<span class="val mono">{page.url.pathname}</span>
			</div>
		</div>

		<h1 class="msg">{msg}</h1>

		{#if correlationId}
			<div class="receipt">
				<div class="receipt-head">
					<span>{m.error_ref()}</span>
					<button type="button" class="copy" onclick={copyId} aria-live="polite">
						{copied ? m.copied() : m.copy()}
					</button>
				</div>
				<code class="receipt-id">{correlationId}</code>
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
			radial-gradient(ellipse 70% 55% at 50% -10%, var(--mood-soft), transparent 60%),
			linear-gradient(to right, rgb(10 10 10 / 0.05) 1px, transparent 1px) 0 0 / 32px 32px,
			linear-gradient(to bottom, rgb(10 10 10 / 0.05) 1px, transparent 1px) 0 0 / 32px 32px,
			var(--color-bg-0);
		mask-image: radial-gradient(ellipse 80% 70% at 50% 30%, #000 0%, #000 50%, transparent 100%);
	}

	.card {
		position: relative;
		width: 100%;
		max-width: 420px;
		padding: 22px 24px 18px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		box-shadow:
			0 1px 0 rgb(255 255 255 / 0.6) inset,
			0 14px 44px -18px rgb(10 10 10 / 0.14),
			0 4px 12px -6px rgb(10 10 10 / 0.06);
		animation: card-in 600ms var(--ease-out) both;
	}

	/* Registration marks at the corners — operations telex */
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
		letter-spacing: -0.005em;
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

	.status-row {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 18px;
		align-items: stretch;
		padding: 22px 4px 14px;
	}

	.status-num {
		font-family: var(--font-mono);
		font-size: clamp(72px, 18vw, 96px);
		font-weight: 600;
		line-height: 0.9;
		letter-spacing: -0.045em;
		color: transparent;
		background:
			linear-gradient(
				180deg,
				var(--color-text-primary) 0%,
				color-mix(in oklab, var(--color-text-primary) 35%, var(--color-bg-0)) 100%
			);
		background-clip: text;
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		font-variant-numeric: tabular-nums;
		display: flex;
		align-items: flex-end;
	}

	.status-meta {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 6px 12px;
		align-content: end;
		padding-bottom: 6px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-text-subtle);
	}

	.status-meta .lbl {
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-text-faint);
	}

	.status-meta .val {
		color: var(--color-text-primary);
		font-weight: 500;
	}

	.status-meta .val.mono {
		font-feature-settings: 'tnum' 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 220px;
	}

	.msg {
		margin: 0;
		padding: 0 4px;
		font-size: 18px;
		font-weight: 500;
		line-height: 1.4;
		letter-spacing: -0.01em;
		color: var(--color-text-primary);
	}

	.receipt {
		margin: 16px 0 4px;
		padding: 10px 12px;
		background: var(--color-bg-1);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-subtle);
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
		transition: background var(--duration-fast) var(--ease-out);
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
		padding-top: 14px;
		border-top: 1px dashed var(--color-border-subtle);
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
		transition:
			background var(--duration-fast) var(--ease-out),
			color var(--duration-fast) var(--ease-out);
	}

	.ghost:hover {
		background: var(--color-bg-1);
		color: var(--color-text-primary);
	}

	/* Staggered reveal */
	.head,
	.status-row,
	.msg,
	.receipt,
	.foot {
		opacity: 0;
		animation: rise 600ms var(--ease-out) both;
	}
	.head {
		animation-delay: 80ms;
	}
	.status-row {
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
		.card,
		.head,
		.status-row,
		.msg,
		.receipt,
		.foot,
		.dot {
			animation: none;
		}
	}
</style>
