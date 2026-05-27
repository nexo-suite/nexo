<script lang="ts">
	import { ChevronDown } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { PageHeader } from '@nexo/ui';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import WeightSummaryLine from '$lib/components/weight/WeightSummaryLine.svelte';
	import WeightSparkline from '$lib/components/weight/WeightSparkline.svelte';
	import WeightLogComposer from '$lib/components/weight/WeightLogComposer.svelte';
	import WeightJournal from '$lib/components/weight/WeightJournal.svelte';
	import WeightTrendChart from '$lib/components/weight/WeightTrendChart.svelte';
	import RangePill from '$lib/components/weight/RangePill.svelte';
	import {
		computePace,
		computeEta,
		describeEta,
		type WeightPoint
	} from '$lib/utils/weightStats';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const allWeights = $derived<WeightPoint[]>(data.weights);
	const startKg = $derived(data.startWeightKg);
	const targetKg = $derived(data.targetWeightKg);

	const latest = $derived(allWeights.length > 0 ? allWeights[allWeights.length - 1] : null);
	const pace = $derived(computePace(allWeights));

	const eta = $derived.by(() => {
		if (!pace || latest == null || targetKg == null) return null;
		return computeEta(latest.kg, latest.date, targetKg, pace.slopePerDay);
	});

	const etaPhrase = $derived.by(() => {
		if (!eta) return null;
		return describeEta(eta.date, new Date());
	});

	const atGoal = $derived(
		latest != null && targetKg != null && Math.abs(targetKg - latest.kg) < 0.2
	);

	const needMoreDays = $derived.by(() => {
		if (allWeights.length === 0) return 7;
		const cutoff = new Date(
			Date.parse(`${allWeights[allWeights.length - 1].date}T00:00:00Z`) - 13 * 24 * 60 * 60 * 1000
		)
			.toISOString()
			.slice(0, 10);
		const inWindow = allWeights.filter((w) => w.date >= cutoff).length;
		return Math.max(0, 7 - inWindow);
	});

	const latestDateLabel = $derived.by(() => {
		if (!latest) return null;
		const todayIso = new Date().toISOString().slice(0, 10);
		if (latest.date === todayIso) return m.weight_date_today();
		const d = new Date(`${latest.date}T00:00:00Z`);
		return new Intl.DateTimeFormat('en', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			timeZone: 'UTC'
		}).format(d);
	});

	let editingDate = $state<string | null>(null);
	let trendOpen = $state(false);
	let chartRange = $state<30 | 90 | 365>(90);

	const filteredForChart = $derived.by<WeightPoint[]>(() => {
		if (allWeights.length === 0) return [];
		const latestMs = Date.parse(`${allWeights[allWeights.length - 1].date}T00:00:00Z`);
		const cutoffMs = latestMs - (chartRange - 1) * 24 * 60 * 60 * 1000;
		const cutoff = new Date(cutoffMs).toISOString().slice(0, 10);
		return allWeights.filter((w) => w.date >= cutoff);
	});
</script>

<div class="page">
	<PageHeader title={m.nav_weight()}>
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
	</PageHeader>

	<header class="spine">
		<div class="s-eyebrow">
			<span class="eyebrow">{m.weight_eyebrow()}</span>
			{#if allWeights.length > 0}
				<span class="s-sep" aria-hidden="true">·</span>
				<span class="eyebrow-num">{m.weight_entry_n({ n: allWeights.length })}</span>
			{/if}
		</div>

		<div class="s-numeral-row">
			{#if latest != null}
				<span class="s-numeral tnum">{latest.kg.toFixed(1)}</span>
				<div class="s-aside">
					<span class="s-unit serif-display">kg</span>
					<span class="s-when serif-italic">{latestDateLabel}</span>
				</div>
			{:else}
				<span class="s-numeral muted">—</span>
				<div class="s-aside">
					<span class="s-unit serif-display">kg</span>
				</div>
			{/if}
		</div>

		{#if allWeights.length >= 2}
			<div class="s-spark">
				<WeightSparkline points={allWeights} {targetKg} />
			</div>
		{/if}

		<WeightSummaryLine
			{startKg}
			latestKg={latest?.kg ?? null}
			latestDate={latest?.date ?? null}
			{targetKg}
			paceKgPerWeek={pace?.kgPerWeek ?? null}
			hasEnoughData={pace != null}
			{atGoal}
			offPace={eta?.offPace ?? false}
			{etaPhrase}
			{needMoreDays}
		/>

		{#if targetKg == null}
			<button class="set-target serif-italic" type="button" onclick={() => goto('/settings')}>
				{m.weight_no_target_hint()}
			</button>
		{/if}
	</header>

	<div class="rule" aria-hidden="true">
		<span class="rule-line"></span>
	</div>

	<WeightLogComposer
		weights={allWeights}
		bind:editingDate
		latestKg={latest?.kg ?? null}
	/>

	<section class="journal-section">
		<div class="js-head">
			<span class="eyebrow">{m.weight_journal_heading()}</span>
		</div>
		<WeightJournal weights={allWeights} bind:editingDate />
	</section>

	{#if allWeights.length >= 2}
		<details class="trend" bind:open={trendOpen}>
			<summary class="trend-summary">
				<span class="ts-label eyebrow">
					{trendOpen ? m.weight_trend_hide() : m.weight_trend_show()}
				</span>
				<ChevronDown size={14} strokeWidth={1.6} class="ts-chevron" />
			</summary>
			<div class="trend-body">
				<div class="t-head">
					<RangePill bind:value={chartRange} />
				</div>
				<WeightTrendChart points={filteredForChart} {targetKg} range={chartRange} />
			</div>
		</details>
	{/if}
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: 12px 16px 96px;
	}

	.spine {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 4px 0 0;
	}

	.s-eyebrow {
		display: inline-flex;
		align-items: baseline;
		gap: 8px;
		color: var(--color-ember-deep);
	}

	.s-sep {
		color: var(--color-text-faint);
		opacity: 0.6;
	}

	.s-numeral-row {
		display: flex;
		align-items: flex-end;
		gap: 12px;
		padding-top: 2px;
	}

	.s-numeral {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variation-settings:
			'opsz' 144,
			'SOFT' 90,
			'wght' 480;
		font-size: clamp(76px, 22vw, 104px);
		line-height: 0.92;
		letter-spacing: -0.045em;
		color: var(--color-text-primary);
	}

	.s-numeral.muted {
		color: var(--color-text-faint);
		opacity: 0.45;
	}

	.s-aside {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-bottom: 8px;
	}

	.s-unit {
		font-size: 18px;
		color: var(--color-text-subtle);
		font-variation-settings:
			'opsz' 24,
			'SOFT' 100,
			'wght' 420;
		letter-spacing: -0.01em;
	}

	.s-when {
		font-size: 13px;
		color: var(--color-ember-deep);
		opacity: 0.85;
		font-variation-settings:
			'opsz' 18,
			'SOFT' 100,
			'wght' 420,
			'ital' 1;
	}

	.s-spark {
		margin: 0 -2px;
		padding-top: 4px;
	}

	.set-target {
		all: unset;
		cursor: pointer;
		font-size: 13px;
		color: var(--color-ember-deep);
		text-decoration: underline;
		text-decoration-thickness: 0.5px;
		text-underline-offset: 3px;
		text-decoration-color: color-mix(in oklab, var(--color-ember) 40%, transparent);
		align-self: flex-start;
		font-variation-settings:
			'opsz' 18,
			'SOFT' 100,
			'wght' 420,
			'ital' 1;
		padding-top: 4px;
	}

	.rule {
		padding: 4px 0 0;
	}

	.rule-line {
		display: block;
		height: 1px;
		background: var(--color-border-subtle);
	}

	.journal-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.js-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 0 4px;
	}

	.trend {
		border-top: 1px solid var(--color-border-subtle);
		padding-top: 8px;
	}

	.trend[open] {
		padding-bottom: 8px;
	}

	.trend-summary {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 4px;
		color: var(--color-text-muted);
		list-style: none;
	}

	.trend-summary::-webkit-details-marker {
		display: none;
	}

	.ts-label {
		color: var(--color-text-muted);
	}

	.trend[open] :global(.ts-chevron) {
		transform: rotate(180deg);
	}

	:global(.ts-chevron) {
		transition: transform 200ms;
	}

	.trend-body {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px 0 4px;
		animation: trend-in 280ms cubic-bezier(0.32, 0.72, 0, 1);
	}

	@keyframes trend-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.t-head {
		display: flex;
		justify-content: flex-end;
	}
</style>
