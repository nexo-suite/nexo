<script lang="ts">
	import { PageHeader } from '@nexo/ui';
	import CalendarHeatmap from '$lib/components/CalendarHeatmap.svelte';
	import DayArchiveSheet from '$lib/components/history/DayArchiveSheet.svelte';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import type { HistoryDay } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const days = $derived<HistoryDay[]>(data.days);
	const targetKcal = $derived(data.targetKcal);
	const totalDaysLogged = $derived(data.totalDaysLogged);

	// Heatmap expects DaySummary[] = { date, kcal, target }
	const heatmapDays = $derived(
		days
			.filter((d) => d.entryCount > 0)
			.map((d) => ({ date: d.date, kcal: d.kcal, target: targetKcal }))
	);

	// Recent days list: last 14 days that have any data (entries OR weight)
	const recentDays = $derived(days.slice(0, 14));

	const avgKcal = $derived.by(() => {
		const logged = days.filter((d) => d.entryCount > 0);
		if (logged.length === 0) return 0;
		return Math.round(logged.reduce((s, d) => s + d.kcal, 0) / logged.length);
	});

	let archiveOpen = $state(false);
	let selectedDate = $state<string | null>(null);
	const selectedDay = $derived<HistoryDay | null>(
		selectedDate ? (days.find((d) => d.date === selectedDate) ?? null) : null
	);

	function openDay(date: string) {
		selectedDate = date;
		archiveOpen = true;
	}

	function fmtRowDate(iso: string): { weekday: string; daymon: string } {
		const d = new Date(`${iso}T00:00:00Z`);
		return {
			weekday: new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(d),
			daymon: new Intl.DateTimeFormat('en', {
				day: 'numeric',
				month: 'short',
				timeZone: 'UTC'
			}).format(d)
		};
	}

	const todayIso = new Date().toISOString().slice(0, 10);
</script>

<div class="page">
	<PageHeader title={m.nav_history()}>
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
	</PageHeader>

	<header class="archive-head">
		<span class="eyebrow">{m.history_eyebrow()}</span>
		<p class="lede serif-display">
			{#if totalDaysLogged === 0}
				{m.history_lede_empty()}
			{:else}
				{@html m.history_lede({
					days: `<span class="lede-num tnum">${totalDaysLogged}</span>`,
					avg: `<span class="lede-num tnum">${avgKcal.toLocaleString()}</span>`
				})}
			{/if}
		</p>
	</header>

	<section class="heatmap-section">
		<div class="hm-head">
			<span class="eyebrow-num">{m.history_heatmap_heading()}</span>
			<span class="hm-target serif-italic">{m.history_target_kcal({ n: targetKcal })}</span>
		</div>
		<CalendarHeatmap days={heatmapDays} onSelect={openDay} />
	</section>

	<section class="recent-section">
		<div class="rs-head">
			<span class="eyebrow">{m.history_recent_heading()}</span>
		</div>
		{#if recentDays.length === 0}
			<p class="empty serif-italic">{m.history_recent_empty()}</p>
		{:else}
			<ol class="rows" role="list">
				{#each recentDays as d (d.date)}
					{@const f = fmtRowDate(d.date)}
					<li>
						<button
							class="row"
							type="button"
							class:today={d.date === todayIso}
							onclick={() => openDay(d.date)}
						>
							<span class="r-date">
								<span class="r-weekday eyebrow-num">{f.weekday}</span>
								<span class="r-daymon serif-display">{f.daymon}</span>
							</span>
							<span class="r-leader" aria-hidden="true"></span>
							<span class="r-kcal">
								{#if d.kcal > 0}
									<span class="r-kcal-num tnum">{Math.round(d.kcal).toLocaleString()}</span>
									<span class="r-kcal-unit eyebrow-num">{m.unit_kcal()}</span>
								{:else}
									<span class="r-kcal-dash eyebrow-num">—</span>
								{/if}
							</span>
							<span class="r-extra eyebrow-num">
								{#if d.entryCount > 0}
									<span class="r-entries">{m.history_row_entries({ n: d.entryCount })}</span>
								{/if}
								{#if d.weightKg != null}
									<span class="r-weight tnum">{d.weightKg.toFixed(1)}<span class="r-weight-unit"> kg</span></span>
								{/if}
							</span>
						</button>
					</li>
				{/each}
			</ol>
		{/if}
	</section>
</div>

<DayArchiveSheet bind:open={archiveOpen} day={selectedDay} />

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 24px;
		padding: 12px 16px 96px;
		position: relative;
		z-index: 1;
	}

	.archive-head {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 4px 0 0;
	}

	.lede {
		margin: 0;
		font-size: 22px;
		line-height: 1.32;
		letter-spacing: -0.018em;
		color: var(--color-text-primary);
		font-variation-settings:
			'opsz' 32,
			'SOFT' 100,
			'wght' 440;
		max-width: 28ch;
	}

	.lede :global(.lede-num) {
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variant-numeric: tabular-nums lining-nums;
		color: var(--color-ember-deep);
		font-variation-settings:
			'opsz' 32,
			'SOFT' 80,
			'wght' 510;
	}

	.heatmap-section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.hm-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 0 2px;
	}

	.hm-target {
		font-size: 12px;
		color: var(--color-text-faint);
		font-variation-settings:
			'opsz' 18,
			'SOFT' 100,
			'wght' 420,
			'ital' 1;
	}

	.recent-section {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.rs-head {
		padding: 0 2px;
	}

	.empty {
		font-size: 14px;
		color: var(--color-text-faint);
		padding: 16px 4px;
		margin: 0;
	}

	.rows {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
	}

	.row {
		all: unset;
		cursor: pointer;
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		align-items: baseline;
		gap: 12px;
		padding: 12px 4px;
		border-bottom: 1px solid var(--color-border-subtle);
		transition: background 200ms;
	}

	.row:hover {
		background: color-mix(in oklab, var(--color-ember) 3%, transparent);
	}

	.row.today {
		box-shadow: inset 2px 0 0 var(--color-ember);
		padding-left: 10px;
	}

	.r-date {
		display: inline-flex;
		align-items: baseline;
		gap: 8px;
	}

	.r-weekday {
		color: var(--color-text-faint);
		font-size: 9.5px;
	}

	.r-daymon {
		font-size: 16px;
		color: var(--color-text-muted);
		font-variation-settings:
			'opsz' 24,
			'SOFT' 100,
			'wght' 440;
		letter-spacing: -0.01em;
	}

	.row.today .r-daymon {
		color: var(--color-text-primary);
	}

	.r-leader {
		align-self: center;
		min-width: 12px;
		height: 1px;
		background-image: radial-gradient(
			circle,
			var(--color-text-faint) 0.55px,
			transparent 0.55px
		);
		background-size: 4px 1px;
		background-repeat: repeat-x;
		background-position: bottom center;
		opacity: 0.45;
	}

	.r-kcal {
		display: inline-flex;
		align-items: baseline;
		gap: 4px;
	}

	.r-kcal-num {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variation-settings:
			'opsz' 24,
			'SOFT' 80,
			'wght' 460;
		font-size: 17px;
		color: var(--color-text-primary);
		letter-spacing: -0.015em;
	}

	.row.today .r-kcal-num {
		color: var(--color-ember-deep);
		font-variation-settings:
			'opsz' 24,
			'SOFT' 80,
			'wght' 510;
	}

	.r-kcal-unit {
		color: var(--color-text-faint);
		font-size: 9px;
	}

	.r-kcal-dash {
		color: var(--color-text-faint);
		opacity: 0.5;
	}

	.r-extra {
		display: inline-flex;
		align-items: baseline;
		gap: 8px;
		color: var(--color-text-faint);
		font-size: 9.5px;
	}

	.r-entries {
		opacity: 0.85;
	}

	.r-weight {
		color: var(--color-text-muted);
		font-size: 11px;
		font-feature-settings: 'tnum' 1, 'lnum' 1;
	}

	.r-weight-unit {
		opacity: 0.55;
	}
</style>
