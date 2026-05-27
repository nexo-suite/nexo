<script lang="ts">
	import type { DaySummary } from '$lib/types';
	import { m } from '$lib/paraglide/messages.js';

	let {
		days,
		onSelect
	}: {
		days: DaySummary[];
		onSelect?: (date: string) => void;
	} = $props();

	type Cell = {
		date: string;
		kcal: number;
		target: number;
		bucket: 0 | 1 | 2 | 3 | 4 | 5;
		isToday: boolean;
		isFuture: boolean;
	};

	const today = new Date();
	const todayKey = today.toISOString().slice(0, 10);

	// Build a 13-week grid (Mon-start), columns are weeks, rows are weekdays.
	const grid = $derived.by(() => {
		const map = new Map(days.map((d) => [d.date, d]));
		const weeks: Cell[][] = [];

		const start = new Date(today);
		start.setDate(today.getDate() - 7 * 12);
		const dow = (start.getDay() + 6) % 7;
		start.setDate(start.getDate() - dow);

		for (let w = 0; w < 13; w++) {
			const col: Cell[] = [];
			for (let dRow = 0; dRow < 7; dRow++) {
				const cur = new Date(start);
				cur.setDate(start.getDate() + w * 7 + dRow);
				const key = cur.toISOString().slice(0, 10);
				const isFuture = key > todayKey;
				const summary = map.get(key);
				const kcal = summary?.kcal ?? 0;
				const target = summary?.target || 2000;
				const ratio = summary && target > 0 ? kcal / target : 0;
				let bucket: Cell['bucket'] = 0;
				if (summary) {
					if (ratio < 0.5) bucket = 1;
					else if (ratio < 0.85) bucket = 2;
					else if (ratio <= 1.05) bucket = 3;
					else if (ratio <= 1.2) bucket = 4;
					else bucket = 5;
				}
				col.push({ date: key, kcal, target, bucket, isToday: key === todayKey, isFuture });
			}
			weeks.push(col);
		}
		return weeks;
	});

	// Month label at the first column where the month changes.
	const monthLabels = $derived.by(() => {
		const labels = new Map<number, string>();
		let lastMonth = -1;
		for (let w = 0; w < grid.length; w++) {
			const d = new Date(`${grid[w][0].date}T00:00:00Z`);
			const month = d.getUTCMonth();
			if (month !== lastMonth) {
				labels.set(w, new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(d));
				lastMonth = month;
			}
		}
		return labels;
	});

	// Show every other day label (M, W, F, S) to reduce clutter.
	const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
	const SHOW_DAY = [true, false, true, false, true, false, true];
</script>

<div class="hm">
	<div class="hm-grid">
		<!-- month label row above the week columns -->
		<div class="month-row" aria-hidden="true">
			{#each { length: 13 } as _, i (i)}
				<span class="ml">{monthLabels.get(i) ?? ''}</span>
			{/each}
		</div>

		<!-- day-of-week axis, aligned with grid rows via shared grid-template-rows -->
		<div class="day-axis" aria-hidden="true">
			{#each DAY_LABELS as label, i (i)}
				<span class="dl" class:visible={SHOW_DAY[i]}>{label}</span>
			{/each}
		</div>

		<!-- 13 week columns × 7 day rows -->
		<div class="week-grid">
			{#each grid as col, ci (ci)}
				<div class="col">
					{#each col as cell (cell.date)}
						<button
							type="button"
							class="cell"
							data-bucket={cell.bucket}
							class:today={cell.isToday}
							class:empty={cell.bucket === 0 && !cell.isFuture}
							class:future={cell.isFuture}
							onclick={() => onSelect?.(cell.date)}
							disabled={cell.isFuture}
							aria-label="{cell.date}: {cell.kcal} kcal"
						></button>
					{/each}
				</div>
			{/each}
		</div>
	</div>

	<div class="legend">
		<span class="lb">{m.history_heatmap_legend_under()}</span>
		<span class="swatches">
			<span class="sw" data-bucket="1" aria-hidden="true"></span>
			<span class="sw" data-bucket="2" aria-hidden="true"></span>
			<span class="sw" data-bucket="3" aria-hidden="true"></span>
			<span class="sw" data-bucket="4" aria-hidden="true"></span>
			<span class="sw" data-bucket="5" aria-hidden="true"></span>
		</span>
		<span class="lb">{m.history_heatmap_legend_over()}</span>
	</div>
</div>

<style>
	.hm {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	/*
	  Two-column grid: [day-axis 10px] [week-grid 1fr]
	  Two-row grid:    [month-row auto] [cells 1fr]
	  The day-axis and week-grid share the same row heights via grid-template-rows.
	*/
	.hm-grid {
		display: grid;
		grid-template-columns: 10px 1fr;
		grid-template-rows: auto 1fr;
		column-gap: 5px;
		row-gap: 3px;
	}

	.month-row {
		grid-column: 2;
		grid-row: 1;
		display: grid;
		grid-template-columns: repeat(13, 1fr);
		gap: 3px;
	}

	.ml {
		font-family: var(--font-mono);
		font-size: 8px;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--color-text-faint);
		line-height: 1;
		white-space: nowrap;
		overflow: hidden;
	}

	.day-axis {
		grid-column: 1;
		grid-row: 2;
		display: grid;
		grid-template-rows: repeat(7, 1fr);
		gap: 3px;
	}

	.dl {
		font-family: var(--font-mono);
		font-size: 8px;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: transparent; /* hidden by default */
		line-height: 1;
		display: flex;
		align-items: center;
	}

	.dl.visible {
		color: var(--color-text-faint);
	}

	.week-grid {
		grid-column: 2;
		grid-row: 2;
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		gap: 3px;
	}

	.col {
		display: grid;
		grid-template-rows: repeat(7, 1fr);
		gap: 3px;
	}

	.cell {
		all: unset;
		aspect-ratio: 1;
		border-radius: 3px;
		background: var(--color-bg-1);
		transition:
			background 200ms,
			transform 120ms;
		cursor: default;
	}

	/* Past days with no data: faintly visible so the grid shape is clear */
	.cell.empty {
		background: color-mix(in oklab, var(--color-text-faint) 14%, var(--color-bg-1));
		cursor: pointer;
	}

	.cell.empty:hover {
		transform: scale(1.15);
	}

	/* Future days: very dim, not interactive */
	.cell.future {
		background: color-mix(in oklab, var(--color-text-faint) 5%, transparent);
	}

	.cell:not(.empty):not(.future)[data-bucket='0'] {
		background: var(--color-bg-1);
	}

	/* Logged day cells are always tappable */
	.cell[data-bucket='1'],
	.cell[data-bucket='2'],
	.cell[data-bucket='3'],
	.cell[data-bucket='4'],
	.cell[data-bucket='5'] {
		cursor: pointer;
	}

	.cell[data-bucket='1']:hover,
	.cell[data-bucket='2']:hover,
	.cell[data-bucket='3']:hover,
	.cell[data-bucket='4']:hover,
	.cell[data-bucket='5']:hover {
		transform: scale(1.18);
	}

	.cell[data-bucket='1'] {
		background: color-mix(in oklab, var(--color-undertarget) 26%, var(--color-bg-1));
	}
	.cell[data-bucket='2'] {
		background: color-mix(in oklab, var(--color-undertarget) 55%, var(--color-bg-1));
	}
	.cell[data-bucket='3'] {
		background: color-mix(in oklab, var(--color-ontarget) 70%, var(--color-bg-1));
	}
	.cell[data-bucket='4'] {
		background: color-mix(in oklab, var(--color-overtarget) 32%, var(--color-bg-1));
	}
	.cell[data-bucket='5'] {
		background: color-mix(in oklab, var(--color-overtarget) 65%, var(--color-bg-1));
	}

	.cell.today {
		box-shadow: 0 0 0 1.5px var(--color-ember);
	}

	.legend {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 2px;
	}

	.lb {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}

	.swatches {
		display: flex;
		gap: 3px;
	}

	.sw {
		width: 10px;
		height: 10px;
		border-radius: 2px;
	}

	.sw[data-bucket='1'] {
		background: color-mix(in oklab, var(--color-undertarget) 26%, var(--color-bg-1));
	}
	.sw[data-bucket='2'] {
		background: color-mix(in oklab, var(--color-undertarget) 55%, var(--color-bg-1));
	}
	.sw[data-bucket='3'] {
		background: color-mix(in oklab, var(--color-ontarget) 70%, var(--color-bg-1));
	}
	.sw[data-bucket='4'] {
		background: color-mix(in oklab, var(--color-overtarget) 32%, var(--color-bg-1));
	}
	.sw[data-bucket='5'] {
		background: color-mix(in oklab, var(--color-overtarget) 65%, var(--color-bg-1));
	}
</style>
