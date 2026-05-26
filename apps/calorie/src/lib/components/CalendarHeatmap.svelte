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
		bucket: 0 | 1 | 2 | 3 | 4 | 5; // 0 = no data
		isToday: boolean;
	};

	const today = new Date();
	const todayKey = today.toISOString().slice(0, 10);

	// Build a 13-week grid (Mon-start), columns are weeks, rows are weekdays.
	const grid = $derived.by(() => {
		const map = new Map(days.map((d) => [d.date, d]));
		const weeks: Cell[][] = [];

		// Start at the Monday 12 weeks ago.
		const start = new Date(today);
		start.setDate(today.getDate() - 7 * 12);
		// Snap back to Monday (1=Mon..0=Sun in getDay()).
		const dow = (start.getDay() + 6) % 7;
		start.setDate(start.getDate() - dow);

		for (let w = 0; w < 13; w++) {
			const col: Cell[] = [];
			for (let dRow = 0; dRow < 7; dRow++) {
				const cur = new Date(start);
				cur.setDate(start.getDate() + w * 7 + dRow);
				const key = cur.toISOString().slice(0, 10);
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
				col.push({
					date: key,
					kcal,
					target,
					bucket,
					isToday: key === todayKey
				});
			}
			weeks.push(col);
		}
		return weeks;
	});
</script>

<div class="hm">
	<div class="grid">
		{#each grid as col, ci (ci)}
			<div class="col">
				{#each col as cell (cell.date)}
					<button
						type="button"
						class="cell"
						data-bucket={cell.bucket}
						class:today={cell.isToday}
						onclick={() => cell.bucket > 0 && onSelect?.(cell.date)}
						disabled={cell.bucket === 0}
						aria-label="{cell.date}: {cell.kcal} kcal"
					></button>
				{/each}
			</div>
		{/each}
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

	.grid {
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
		cursor: pointer;
	}

	.cell:disabled {
		cursor: default;
	}

	.cell:not(:disabled):hover {
		transform: scale(1.18);
	}

	/* Buckets — honey under, sage on, terracotta over.
	   Two intensity steps under and over keep the visual quiet but readable. */
	.cell[data-bucket='0'] {
		background: var(--color-bg-1);
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
