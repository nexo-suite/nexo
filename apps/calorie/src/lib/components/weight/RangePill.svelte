<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	type RangeValue = 30 | 90 | 365;

	let { value = $bindable<RangeValue>(90) }: { value?: RangeValue } = $props();

	const opts: { id: RangeValue; label: () => string }[] = [
		{ id: 30, label: m.weight_range_30 },
		{ id: 90, label: m.weight_range_90 },
		{ id: 365, label: m.weight_range_all }
	];
</script>

<div class="pill" role="group">
	{#each opts as o (o.id)}
		<button
			class="opt"
			class:on={value === o.id}
			type="button"
			onclick={() => (value = o.id)}
			aria-pressed={value === o.id}
		>
			{o.label()}
		</button>
	{/each}
</div>

<style>
	.pill {
		display: inline-flex;
		gap: 2px;
		padding: 3px;
		background: var(--color-bg-1);
		border-radius: 999px;
		border: 1px solid var(--color-border-subtle);
	}

	.opt {
		all: unset;
		cursor: pointer;
		padding: 5px 11px;
		border-radius: 999px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-text-muted);
		transition: all 160ms;
	}

	.opt.on {
		background: var(--color-surface-1);
		color: var(--color-ember-deep);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	}
</style>
