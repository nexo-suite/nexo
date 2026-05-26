<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	export type Scenario = 'pause-subs' | 'income-up' | 'drop-debt';

	let {
		active = $bindable<Scenario[]>([])
	}: {
		active: Scenario[];
	} = $props();

	const CHIPS: { id: Scenario; emoji: string; label: string; tone: string }[] = $derived([
		{ id: 'pause-subs', emoji: '🎬', label: m.scenarios_pause_subs(), tone: 'expense' },
		{ id: 'income-up', emoji: '📈', label: m.scenarios_income_up(), tone: 'income' },
		{ id: 'drop-debt', emoji: '✂️', label: m.scenarios_drop_debt(), tone: 'debt' }
	]);

	function toggle(id: Scenario) {
		if (active.includes(id)) {
			active = active.filter((s) => s !== id);
		} else {
			active = [...active, id];
		}
	}
</script>

<div class="scenarios" role="group" aria-label={m.scenarios_aria()}>
	<div class="scenarios-head">
		<span class="scenarios-label">{m.scenarios_what_if()}</span>
		<span class="scenarios-tag">{m.scenarios_experimental()}</span>
	</div>
	<div class="scenarios-row">
		{#each CHIPS as chip (chip.id)}
			{@const isActive = active.includes(chip.id)}
			<button
				type="button"
				class="chip chip-{chip.tone}"
				class:active={isActive}
				onclick={() => toggle(chip.id)}
				aria-pressed={isActive}
			>
				<span class="chip-emoji" aria-hidden="true">{chip.emoji}</span>
				<span class="chip-label">{chip.label}</span>
				{#if isActive}
					<span class="chip-dot" aria-hidden="true"></span>
				{/if}
			</button>
		{/each}
	</div>
</div>

<style>
	.scenarios {
		padding: 12px 14px 14px;
		border-radius: var(--radius-xl);
		background:
			radial-gradient(
				ellipse at 100% 0%,
				color-mix(in oklab, var(--color-accent) 8%, transparent),
				transparent 60%
			),
			var(--color-surface-1);
		border: 1px solid var(--color-border-subtle);
	}
	.scenarios-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 10px;
	}
	.scenarios-label {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}
	.scenarios-tag {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 3px 7px;
		border-radius: 999px;
		background: var(--color-bg-1);
		color: var(--color-text-faint);
	}
	.scenarios-row {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.scenarios-row::-webkit-scrollbar {
		display: none;
	}
	.chip {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 12px 7px 10px;
		border-radius: 999px;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-subtle);
		font: inherit;
		font-size: 12.5px;
		font-weight: 500;
		color: var(--color-text-muted);
		cursor: pointer;
		position: relative;
		transition:
			background var(--duration-fast) var(--ease-out),
			border-color var(--duration-fast) var(--ease-out),
			color var(--duration-fast) var(--ease-out),
			transform var(--duration-fast) var(--ease-out);
	}
	.chip:active {
		transform: scale(0.96);
	}
	.chip-emoji {
		font-size: 14px;
		line-height: 1;
	}
	.chip-expense.active {
		background: var(--expense-soft);
		border-color: var(--expense-line);
		color: var(--expense-ink);
	}
	.chip-income.active {
		background: var(--income-soft);
		border-color: var(--income-line);
		color: var(--income-ink);
	}
	.chip-debt.active {
		background: var(--debt-soft);
		border-color: var(--debt-line);
		color: var(--debt-ink);
	}
	.chip-dot {
		width: 5px;
		height: 5px;
		border-radius: 999px;
		background: currentColor;
		opacity: 0.85;
	}
</style>
