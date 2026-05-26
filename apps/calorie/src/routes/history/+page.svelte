<script lang="ts">
	import { BottomSheet, PageHeader } from '@nexo/ui';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import WeightChart from '$lib/components/WeightChart.svelte';
	import CalendarHeatmap from '$lib/components/CalendarHeatmap.svelte';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const weights = $derived(data.weights);
	const dailyKcalRaw = $derived(data.dailyKcal);

	// Reshape kcal totals into the DaySummary shape the heatmap expects (target = 0 fallback)
	const dailyKcal = $derived(
		dailyKcalRaw.map((d) => ({ date: d.date, kcal: d.kcal, target: 2000 }))
	);

	let logWeightOpen = $state(false);
	let newWeight = $state(untrack(() => weights[weights.length - 1]?.kg ?? 78));

	$effect(() => {
		const last = weights[weights.length - 1]?.kg;
		if (last) newWeight = last;
	});

	let dayDetailOpen = $state(false);
	let selectedDate = $state<string | null>(null);

	const selectedDay = $derived(dailyKcal.find((d) => d.date === selectedDate));
	const dayPct = $derived(
		selectedDay && selectedDay.target ? Math.round((selectedDay.kcal / selectedDay.target) * 100) : 0
	);

	function handleSelect(date: string) {
		selectedDate = date;
		dayDetailOpen = true;
	}
</script>

<div class="page">
	<PageHeader title={m.history_weight()} subtitle={m.history_eyebrow()}>
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
	</PageHeader>

	<section class="card weight-card">
		<WeightChart logs={weights} height={140} onLogToday={() => (logWeightOpen = true)} />
	</section>

	<section class="heatmap-section">
		<div class="hm-head">
			<span class="eyebrow">{m.history_heatmap_heading()}</span>
		</div>
		<div class="card heat-card">
			<CalendarHeatmap days={dailyKcal} onSelect={handleSelect} />
		</div>
	</section>
</div>

<BottomSheet bind:open={logWeightOpen} title={m.history_weight_log()}>
	<form
		class="weight-form"
		method="POST"
		action="/history?/logWeight"
		use:enhance={() => {
			return async ({ update }) => {
				await update();
				logWeightOpen = false;
			};
		}}
	>
		<input type="hidden" name="date" value={new Date().toISOString().slice(0, 10)} />
		<div class="big-num">
			<input
				class="bn-input"
				type="number"
				inputmode="decimal"
				step="0.1"
				name="kg"
				bind:value={newWeight}
			/>
			<span class="bn-unit">kg</span>
		</div>
		<button class="confirm" type="submit">{m.action_save()}</button>
	</form>
</BottomSheet>

<BottomSheet bind:open={dayDetailOpen} title={selectedDate ?? ''}>
	{#if selectedDay}
		<div class="day-summary">
			<div class="ds-head">
				<div class="ds-num-block">
					<div class="ds-num">{selectedDay.kcal.toLocaleString()}</div>
					<div class="ds-target">{m.unit_kcal()}</div>
				</div>
				<div class="ds-pct" class:over={dayPct > 105} class:under={dayPct < 85}>
					{dayPct}%
				</div>
			</div>
		</div>
	{/if}
</BottomSheet>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding: 16px 16px 24px;
		position: relative;
		z-index: 1;
	}

	.eyebrow {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--color-text-faint);
	}

	.card {
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: 18px;
		padding: 16px 18px;
	}

	.weight-card {
		padding: 18px 20px 8px;
	}

	.heatmap-section {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.hm-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.heat-card {
		padding: 16px;
	}

	.weight-form {
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: 8px 0 8px;
	}

	.big-num {
		display: flex;
		justify-content: center;
		align-items: baseline;
		gap: 8px;
		padding: 30px 0 12px;
	}

	.bn-input {
		all: unset;
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1;
		font-variation-settings:
			'opsz' 144,
			'SOFT' 90,
			'wght' 480;
		font-size: 78px;
		line-height: 0.92;
		letter-spacing: -0.04em;
		color: var(--color-text-primary);
		text-align: center;
		width: 5ch;
	}

	.bn-unit {
		font-size: 18px;
		color: var(--color-text-subtle);
	}

	.confirm {
		all: unset;
		cursor: pointer;
		padding: 16px 22px;
		text-align: center;
		background: var(--color-ember);
		color: oklch(98% 0.008 70);
		border-radius: 16px;
		font-size: 15px;
		font-weight: 500;
	}

	.day-summary {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 0 0 8px;
	}

	.ds-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.ds-num-block {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.ds-num {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1;
		font-variation-settings:
			'opsz' 96,
			'SOFT' 80,
			'wght' 480;
		font-size: 44px;
		line-height: 1;
		letter-spacing: -0.03em;
		color: var(--color-text-primary);
	}

	.ds-target {
		font-size: 12px;
		color: var(--color-text-subtle);
	}

	.ds-pct {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1;
		font-variation-settings:
			'opsz' 36,
			'wght' 460;
		font-size: 22px;
		color: var(--color-ontarget);
		padding: 4px 12px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--color-ontarget) 12%, var(--color-bg-0));
	}

	.ds-pct.over {
		color: var(--color-overtarget);
		background: color-mix(in oklab, var(--color-overtarget) 12%, var(--color-bg-0));
	}

	.ds-pct.under {
		color: oklch(50% 0.1 88);
		background: color-mix(in oklab, var(--color-undertarget) 18%, var(--color-bg-0));
	}
</style>
