<script lang="ts">
	import type { MealSlot } from '$lib/types';
	import { m } from '$lib/paraglide/messages.js';

	let { slot, size = 'md' }: { slot: MealSlot; size?: 'sm' | 'md' } = $props();

	const labels: Record<MealSlot, () => string> = {
		breakfast: m.meal_breakfast,
		lunch: m.meal_lunch,
		dinner: m.meal_dinner,
		snack: m.meal_snack
	};

	const colorVars: Record<MealSlot, string> = {
		breakfast: '--color-slot-breakfast',
		lunch: '--color-slot-lunch',
		dinner: '--color-slot-dinner',
		snack: '--color-slot-snack'
	};
</script>

<span class="chip" class:sm={size === 'sm'} style:--chip-c="var({colorVars[slot]})">
	<span class="dot" aria-hidden="true"></span>
	<span class="label">{labels[slot]()}</span>
</span>

<style>
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 2px 8px 2px 6px;
		border-radius: 999px;
		font-size: 10px;
		letter-spacing: 0.04em;
		text-transform: lowercase;
		color: color-mix(in oklab, var(--chip-c) 70%, var(--color-text-primary));
		background: color-mix(in oklab, var(--chip-c) 10%, var(--color-bg-0));
		border: 1px solid color-mix(in oklab, var(--chip-c) 22%, var(--color-border-default));
	}

	.chip.sm {
		font-size: 9px;
		padding: 1px 6px 1px 5px;
		gap: 4px;
	}

	.dot {
		width: 5px;
		height: 5px;
		border-radius: 999px;
		background: var(--chip-c);
	}

	.chip.sm .dot {
		width: 4px;
		height: 4px;
	}

	.label {
		font-family: var(--font-mono);
		font-feature-settings: 'tnum' 1;
	}
</style>
