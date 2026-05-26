<script lang="ts">
	import { BottomSheet } from '@nexo/ui';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Plus } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	let open = $state(false);

	const FLOWS: {
		emoji: string;
		label: string;
		desc: string;
		href: string;
		tone: 'expense' | 'income' | 'debt';
	}[] = $derived([
		{
			emoji: '💸',
			label: m.quickadd_expense_label(),
			desc: m.quickadd_expense_desc(),
			href: '/expenses?add=true',
			tone: 'expense'
		},
		{
			emoji: '💰',
			label: m.quickadd_income_label(),
			desc: m.quickadd_income_desc(),
			href: '/income?add=true',
			tone: 'income'
		},
		{
			emoji: '🤝',
			label: m.quickadd_debt_label(),
			desc: m.quickadd_debt_desc(),
			href: '/debt?add=true',
			tone: 'debt'
		}
	]);

	// Hide on login + offline
	const visible = $derived(
		page.url.pathname !== '/login' && page.url.pathname !== '/offline'
	);

	function pick(href: string) {
		open = false;
		// Slight delay so the sheet finishes closing
		setTimeout(() => goto(href), 60);
	}
</script>

{#if visible}
	<button
		type="button"
		class="fab"
		aria-label={m.quickadd_fab_aria()}
		onclick={() => (open = !open)}
	>
		<span class="fab-glow" aria-hidden="true"></span>
		<span class="fab-icon">
			<Plus size={22} strokeWidth={2.4} />
		</span>
	</button>
{/if}

<BottomSheet bind:open title={m.quickadd_title()} subtitle={m.quickadd_subtitle()}>
	<div class="chooser">
		{#each FLOWS as flow, i (flow.label)}
			<button
				type="button"
				class="flow flow-{flow.tone}"
				onclick={() => pick(flow.href)}
				style="--stagger: {i * 50}ms;"
			>
				<span class="flow-emoji" aria-hidden="true">{flow.emoji}</span>
				<span class="flow-body">
					<span class="flow-label">{flow.label}</span>
					<span class="flow-desc">{flow.desc}</span>
				</span>
				<span class="flow-arrow" aria-hidden="true">→</span>
			</button>
		{/each}
	</div>
	<p class="chooser-hint">{m.quickadd_hint_prefix()} <span class="kbd">+</span> {m.quickadd_hint_suffix()}</p>
</BottomSheet>

<style>
	.fab {
		position: fixed;
		right: 18px;
		bottom: calc(var(--tab-h, 64px) + var(--safe-bot, 0px) + 14px);
		width: 56px;
		height: 56px;
		border-radius: 999px;
		background: var(--color-text-primary);
		color: var(--color-bg-0);
		border: 0;
		display: grid;
		place-items: center;
		cursor: pointer;
		z-index: 45;
		box-shadow:
			0 12px 32px -8px color-mix(in oklab, var(--color-text-primary) 45%, transparent),
			0 4px 10px -2px rgba(15, 15, 17, 0.18);
		transition:
			transform var(--duration-base) var(--ease-out),
			box-shadow var(--duration-base) var(--ease-out);
		isolation: isolate;
	}
	.fab:active {
		transform: scale(0.92);
	}
	.fab-glow {
		position: absolute;
		inset: -6px;
		border-radius: 999px;
		background: radial-gradient(circle, var(--color-accent), transparent 65%);
		opacity: 0.35;
		z-index: -1;
		filter: blur(10px);
		animation: fab-pulse 3.6s ease-in-out infinite;
	}
	.fab-icon {
		display: grid;
		place-items: center;
	}

	@keyframes fab-pulse {
		0%,
		100% {
			opacity: 0.32;
			transform: scale(0.96);
		}
		50% {
			opacity: 0.5;
			transform: scale(1.08);
		}
	}

	.chooser {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.flow {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 16px;
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
		background: var(--color-surface-1);
		text-align: left;
		font: inherit;
		color: inherit;
		cursor: pointer;
		transition:
			transform var(--duration-base) var(--ease-out),
			border-color var(--duration-base) var(--ease-out),
			background var(--duration-base) var(--ease-out);
		animation: flow-in 360ms var(--ease-out) backwards;
		animation-delay: var(--stagger);
	}
	.flow:active {
		transform: scale(0.98);
	}
	.flow-expense:hover,
	.flow-expense:focus-visible {
		border-color: var(--expense-line);
		background: var(--expense-soft);
	}
	.flow-income:hover,
	.flow-income:focus-visible {
		border-color: var(--income-line);
		background: var(--income-soft);
	}
	.flow-debt:hover,
	.flow-debt:focus-visible {
		border-color: var(--debt-line);
		background: var(--debt-soft);
	}

	.flow-emoji {
		font-size: 26px;
		line-height: 1;
		width: 44px;
		height: 44px;
		display: grid;
		place-items: center;
		border-radius: var(--radius-md);
		background: var(--color-bg-1);
		flex: none;
	}
	.flow-expense .flow-emoji {
		background: var(--expense-soft);
	}
	.flow-income .flow-emoji {
		background: var(--income-soft);
	}
	.flow-debt .flow-emoji {
		background: var(--debt-soft);
	}

	.flow-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.flow-label {
		font-size: 15.5px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--color-text-primary);
	}
	.flow-desc {
		font-size: 12px;
		color: var(--color-text-subtle);
	}
	.flow-arrow {
		color: var(--color-text-faint);
		font-size: 18px;
		font-family: var(--font-mono);
	}

	.chooser-hint {
		margin-top: 14px;
		font-size: 11.5px;
		color: var(--color-text-faint);
		text-align: center;
	}
	.kbd {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 5px;
		background: var(--color-bg-2);
		border: 1px solid var(--color-border-subtle);
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--color-text-muted);
		margin: 0 2px;
	}

	@keyframes flow-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
