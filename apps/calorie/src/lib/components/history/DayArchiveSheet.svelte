<script lang="ts">
	import { BottomSheet } from '@nexo/ui';
	import { m } from '$lib/paraglide/messages.js';
	import type { HistoryDay } from '$lib/types';

	let {
		open = $bindable(false),
		day
	}: {
		open?: boolean;
		day: HistoryDay | null;
	} = $props();

	const titleLabel = $derived.by(() => {
		if (!day) return '';
		const d = new Date(`${day.date}T00:00:00Z`);
		return new Intl.DateTimeFormat('en', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			timeZone: 'UTC'
		}).format(d);
	});

	const sortedEntries = $derived.by(() => {
		if (!day) return [];
		return [...day.entries].sort((a, b) =>
			a.loggedAt < b.loggedAt ? 1 : a.loggedAt > b.loggedAt ? -1 : 0
		);
	});

	function timeOf(iso: string): string {
		const d = new Date(iso);
		return new Intl.DateTimeFormat('en', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		}).format(d);
	}

	function quantityLabel(grams: number, unit: string): string {
		if (!grams) return '';
		if (unit === 'g' || unit === 'ml') return `${Math.round(grams)} ${unit}`;
		// Non-gram unit — show grams as the canonical (unit field on entries is the unit picker, grams is canonical)
		return `${Math.round(grams)} g`;
	}
</script>

<BottomSheet bind:open title={titleLabel}>
	{#if day}
		<div class="archive">
			<div class="head-row">
				<div class="hr-num">
					<span class="hr-kcal tnum">{day.kcal.toLocaleString()}</span>
					<span class="hr-unit">{m.unit_kcal()}</span>
				</div>
				<div class="hr-meta">
					<span class="hr-meta-line">
						<span class="hr-meta-num tnum">{day.entryCount}</span>
						<span class="hr-meta-lab serif-italic">
							{day.entryCount === 1 ? m.archive_entry_one() : m.archive_entry_many()}
						</span>
					</span>
					{#if day.weightKg != null}
						<span class="hr-sep" aria-hidden="true">·</span>
						<span class="hr-meta-line">
							<span class="hr-meta-num tnum">{day.weightKg.toFixed(1)}</span>
							<span class="hr-meta-lab serif-italic">kg</span>
						</span>
					{/if}
				</div>
			</div>

			{#if sortedEntries.length === 0}
				<p class="empty serif-italic">{m.archive_no_entries()}</p>
			{:else}
				<ol class="entries" role="list">
					{#each sortedEntries as e (e.id)}
						<li class="e-row">
							<span class="e-time eyebrow-num">{timeOf(e.loggedAt)}</span>
							<span class="e-name">{e.foodName}</span>
							<span class="e-qty eyebrow-num">{quantityLabel(e.grams, e.unit)}</span>
							<span class="e-kcal tnum">{Math.round(e.kcal)}</span>
						</li>
					{/each}
				</ol>

				{#if day.proteinG > 0 || day.carbsG > 0 || day.fatG > 0}
					<div class="totals">
						<div class="t-cell">
							<span class="t-lab eyebrow">{m.macro_protein()}</span>
							<span class="t-num tnum">{Math.round(day.proteinG)}<span class="t-u"> g</span></span>
						</div>
						<div class="t-cell">
							<span class="t-lab eyebrow">{m.macro_carbs()}</span>
							<span class="t-num tnum">{Math.round(day.carbsG)}<span class="t-u"> g</span></span>
						</div>
						<div class="t-cell">
							<span class="t-lab eyebrow">{m.macro_fat()}</span>
							<span class="t-num tnum">{Math.round(day.fatG)}<span class="t-u"> g</span></span>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</BottomSheet>

<style>
	.archive {
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: 0 0 8px;
	}

	.head-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		padding-bottom: 14px;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.hr-num {
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
	}

	.hr-kcal {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variation-settings:
			'opsz' 96,
			'SOFT' 80,
			'wght' 480;
		font-size: 44px;
		line-height: 1;
		letter-spacing: -0.03em;
		color: var(--color-text-primary);
	}

	.hr-unit {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}

	.hr-meta {
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-text-muted);
		padding-bottom: 4px;
	}

	.hr-meta-line {
		display: inline-flex;
		align-items: baseline;
		gap: 4px;
	}

	.hr-meta-num {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1;
		font-variation-settings:
			'opsz' 24,
			'SOFT' 80,
			'wght' 460;
		font-size: 17px;
		color: var(--color-text-primary);
		letter-spacing: -0.015em;
	}

	.hr-meta-lab {
		font-size: 12px;
		color: var(--color-text-subtle);
	}

	.hr-sep {
		opacity: 0.4;
	}

	.empty {
		font-size: 14px;
		color: var(--color-text-faint);
		padding: 12px 4px;
		margin: 0;
	}

	.entries {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
	}

	.e-row {
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		align-items: baseline;
		gap: 12px;
		padding: 10px 2px;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.e-row:last-child {
		border-bottom: none;
	}

	.e-time {
		color: var(--color-text-faint);
		font-size: 9.5px;
		min-width: 5ch;
	}

	.e-name {
		font-family: var(--font-display);
		font-variation-settings:
			'opsz' 24,
			'SOFT' 100,
			'wght' 440;
		font-size: 15px;
		color: var(--color-text-primary);
		letter-spacing: -0.01em;
		line-height: 1.25;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.e-qty {
		color: var(--color-text-faint);
		font-size: 9.5px;
		text-align: right;
		min-width: 6ch;
	}

	.e-kcal {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variation-settings:
			'opsz' 24,
			'SOFT' 80,
			'wght' 460;
		font-size: 16px;
		color: var(--color-text-primary);
		min-width: 4ch;
		text-align: right;
		letter-spacing: -0.015em;
	}

	.totals {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 10px;
		padding: 12px 0 0;
		border-top: 1px solid var(--color-border-subtle);
	}

	.t-cell {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.t-lab {
		color: var(--color-text-faint);
		font-size: 9.5px;
	}

	.t-num {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variation-settings:
			'opsz' 24,
			'SOFT' 80,
			'wght' 460;
		font-size: 18px;
		color: var(--color-text-primary);
		letter-spacing: -0.015em;
	}

	.t-u {
		font-size: 11px;
		color: var(--color-text-subtle);
		font-variation-settings:
			'opsz' 18,
			'SOFT' 80,
			'wght' 420;
	}
</style>
