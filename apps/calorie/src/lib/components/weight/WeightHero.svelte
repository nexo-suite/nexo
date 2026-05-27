<script lang="ts">
	import { TrendingDown, TrendingUp } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	let {
		latestKg,
		entryNumber,
		startKg,
		targetKg,
		latestDate
	}: {
		latestKg: number | null;
		entryNumber: number;
		startKg: number | null;
		targetKg: number | null;
		latestDate: string | null;
	} = $props();

	const sinceMonth = $derived.by(() => {
		if (!latestDate || !startKg) return null;
		try {
			const d = new Date(`${latestDate}T00:00:00Z`);
			return new Intl.DateTimeFormat('en', { month: 'short' }).format(d);
		} catch {
			return null;
		}
	});

	const delta = $derived(latestKg != null && startKg != null ? latestKg - startKg : null);
	const toGo = $derived(latestKg != null && targetKg != null ? targetKg - latestKg : null);
	const atGoal = $derived(toGo != null && Math.abs(toGo) < 0.2);
</script>

<header class="hero">
	<div class="eyebrow">
		<span class="eb-label">{m.weight_eyebrow()}</span>
		<span class="eb-sep">·</span>
		<span class="eb-num tnum">{m.weight_entry_n({ n: entryNumber })}</span>
	</div>

	<div class="numeral-block">
		{#if latestKg != null}
			<span class="numeral tnum">{latestKg.toFixed(1)}</span>
			<span class="unit">kg</span>
		{:else}
			<span class="numeral muted">—</span>
			<span class="unit">kg</span>
		{/if}
	</div>

	<div class="rule" aria-hidden="true"></div>

	<div class="meta">
		{#if delta != null && Math.abs(delta) >= 0.1}
			<span class="delta tnum" class:down={delta < 0} class:up={delta > 0}>
				{#if delta < 0}
					<TrendingDown size={11} strokeWidth={1.9} />
					<span>{Math.abs(delta).toFixed(1)} kg</span>
				{:else}
					<TrendingUp size={11} strokeWidth={1.9} />
					<span>+{delta.toFixed(1)} kg</span>
				{/if}
			</span>
			{#if sinceMonth}
				<span class="since">{m.weight_since_month({ month: sinceMonth })}</span>
			{:else}
				<span class="since">{m.weight_since_start()}</span>
			{/if}
		{/if}

		{#if delta != null && toGo != null && !atGoal}
			<span class="meta-sep">·</span>
		{/if}

		{#if toGo != null}
			{#if atGoal}
				<span class="at-goal">{m.weight_at_goal()}</span>
			{:else}
				<span class="to-go tnum">{m.weight_to_go({ kg: `${Math.abs(toGo).toFixed(1)} kg` })}</span>
			{/if}
		{/if}
	</div>
</header>

<style>
	.hero {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 4px 0 0;
	}

	.eyebrow {
		display: inline-flex;
		align-items: baseline;
		gap: 8px;
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		font-weight: 500;
		color: var(--color-ember-deep);
	}

	.eb-label {
		opacity: 0.95;
	}

	.eb-sep {
		opacity: 0.4;
	}

	.eb-num {
		opacity: 0.65;
		letter-spacing: 0.18em;
	}

	.numeral-block {
		display: flex;
		align-items: baseline;
		gap: 8px;
		padding-top: 2px;
	}

	.numeral {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variation-settings: 'opsz' 144, 'SOFT' 90, 'wght' 480;
		font-size: clamp(78px, 22vw, 104px);
		line-height: 0.92;
		letter-spacing: -0.045em;
		color: var(--color-text-primary);
	}

	.numeral.muted {
		color: var(--color-text-faint);
		opacity: 0.5;
	}

	.unit {
		font-family: var(--font-display);
		font-variation-settings: 'opsz' 36, 'SOFT' 90, 'wght' 420;
		font-size: 22px;
		color: var(--color-text-subtle);
		letter-spacing: -0.01em;
	}

	.rule {
		width: 56px;
		height: 1px;
		background: linear-gradient(
			to right,
			var(--color-ember) 0%,
			color-mix(in oklab, var(--color-ember) 30%, transparent) 90%,
			transparent 100%
		);
		margin-top: 2px;
	}

	.meta {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 6px;
		padding-top: 4px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.04em;
		color: var(--color-text-subtle);
	}

	.delta {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}

	.delta.down {
		color: var(--color-ontarget);
	}

	.delta.up {
		color: var(--color-overtarget);
	}

	.since {
		font-style: italic;
		opacity: 0.85;
		font-family: var(--font-display);
		font-variation-settings: 'opsz' 18, 'SOFT' 100, 'wght' 380, 'ital' 1;
		font-size: 12px;
		letter-spacing: -0.005em;
	}

	.meta-sep {
		opacity: 0.35;
		padding: 0 2px;
	}

	.to-go {
		color: var(--color-text-muted);
	}

	.at-goal {
		color: var(--color-ontarget);
		font-family: var(--font-display);
		font-variation-settings: 'opsz' 18, 'SOFT' 100, 'wght' 460, 'ital' 1;
		font-size: 12px;
	}
</style>
