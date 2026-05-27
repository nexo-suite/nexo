<script lang="ts">
	import type { WeightPoint } from '$lib/utils/weightStats';
	import { m } from '$lib/paraglide/messages.js';

	let {
		points,
		targetKg,
		range
	}: {
		points: WeightPoint[];
		targetKg: number | null;
		range: 30 | 90 | 365;
	} = $props();

	const W = 600;
	const H = 180;
	const PAD_T = 16;
	const PAD_B = 26;
	const PAD_X = 16;

	const sorted = $derived([...points].sort((a, b) => a.date.localeCompare(b.date)));

	const smoothed = $derived.by(() => {
		const win = 3;
		return sorted.map((_, i) => {
			const slice = sorted.slice(Math.max(0, i - win + 1), i + 1);
			const sum = slice.reduce((s, p) => s + p.kg, 0);
			return slice.length ? sum / slice.length : sorted[i].kg;
		});
	});

	const yRange = $derived.by(() => {
		if (sorted.length === 0) return { min: 0, max: 1 };
		const all = sorted.map((p) => p.kg);
		if (targetKg != null) all.push(targetKg);
		const min = Math.min(...all);
		const max = Math.max(...all);
		const pad = (max - min) * 0.18 || 0.6;
		return { min: min - pad, max: max + pad };
	});

	const dateRange = $derived.by(() => {
		if (sorted.length === 0) return null;
		const first = Date.parse(`${sorted[0].date}T00:00:00Z`);
		const last = Date.parse(`${sorted[sorted.length - 1].date}T00:00:00Z`);
		return { firstMs: first, lastMs: last, span: Math.max(1, last - first) };
	});

	function xAt(i: number): number {
		if (!dateRange || sorted.length <= 1) return W / 2;
		const ms = Date.parse(`${sorted[i].date}T00:00:00Z`);
		const t = (ms - dateRange.firstMs) / dateRange.span;
		return PAD_X + t * (W - 2 * PAD_X);
	}

	function yAt(kg: number): number {
		const span = yRange.max - yRange.min || 1;
		return PAD_T + (1 - (kg - yRange.min) / span) * (H - PAD_T - PAD_B);
	}

	const trendPath = $derived.by(() => {
		if (smoothed.length === 0) return '';
		if (smoothed.length === 1) return `M ${xAt(0)} ${yAt(smoothed[0])}`;
		let d = `M ${xAt(0).toFixed(2)} ${yAt(smoothed[0]).toFixed(2)}`;
		for (let i = 1; i < smoothed.length - 1; i++) {
			const cx = xAt(i);
			const cy = yAt(smoothed[i]);
			const nx = (xAt(i) + xAt(i + 1)) / 2;
			const ny = (yAt(smoothed[i]) + yAt(smoothed[i + 1])) / 2;
			d += ` Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${nx.toFixed(2)} ${ny.toFixed(2)}`;
		}
		const last = smoothed.length - 1;
		d += ` T ${xAt(last).toFixed(2)} ${yAt(smoothed[last]).toFixed(2)}`;
		return d;
	});

	const targetY = $derived(targetKg != null ? yAt(targetKg) : null);

	type AxisTick = { x: number; label: string };

	const axisTicks = $derived.by<AxisTick[]>(() => {
		if (!dateRange || sorted.length === 0) return [];
		const totalDays = (dateRange.lastMs - dateRange.firstMs) / (24 * 60 * 60 * 1000);
		const ticks: AxisTick[] = [];
		if (range === 30 || totalDays <= 35) {
			const step = 7 * 24 * 60 * 60 * 1000;
			let cursor = dateRange.firstMs;
			while (cursor <= dateRange.lastMs) {
				const t = (cursor - dateRange.firstMs) / dateRange.span;
				const d = new Date(cursor);
				ticks.push({
					x: PAD_X + t * (W - 2 * PAD_X),
					label: new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(d)
				});
				cursor += step;
			}
		} else {
			let cursor = new Date(dateRange.firstMs);
			cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
			while (cursor.getTime() <= dateRange.lastMs) {
				if (cursor.getTime() >= dateRange.firstMs) {
					const t = (cursor.getTime() - dateRange.firstMs) / dateRange.span;
					ticks.push({
						x: PAD_X + t * (W - 2 * PAD_X),
						label: new Intl.DateTimeFormat('en', { month: 'short' }).format(cursor)
					});
				}
				cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
			}
		}
		return ticks;
	});
</script>

<div class="chart-host">
	{#if sorted.length === 0}
		<div class="empty">
			<span class="empty-text">{m.weight_chart_empty()}</span>
		</div>
	{:else}
		<svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" width="100%" height="auto" role="img">
			<!-- Quiet horizontal grid -->
			{#each [0.25, 0.5, 0.75] as q (q)}
				<line
					x1={PAD_X}
					x2={W - PAD_X}
					y1={PAD_T + q * (H - PAD_T - PAD_B)}
					y2={PAD_T + q * (H - PAD_T - PAD_B)}
					stroke="var(--color-border-subtle)"
					stroke-width="1"
					stroke-dasharray="2 5"
					opacity="0.5"
				/>
			{/each}

			<!-- Target rule -->
			{#if targetY != null}
				<line
					x1={PAD_X}
					x2={W - PAD_X}
					y1={targetY}
					y2={targetY}
					stroke="var(--color-ember)"
					stroke-width="1.2"
					stroke-dasharray="3 4"
					opacity="0.7"
				/>
				<text
					x={W - PAD_X}
					y={targetY - 6}
					text-anchor="end"
					class="target-label"
					fill="var(--color-ember-deep)"
				>
					{m.weight_target_chart_label({ kg: targetKg!.toFixed(1) })}
				</text>
			{/if}

			<!-- Trend line -->
			{#if trendPath}
				<path
					d={trendPath}
					fill="none"
					stroke="var(--color-ember)"
					stroke-width="1.6"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			{/if}

			<!-- Daily dots -->
			{#each sorted as p, i (p.date)}
				<circle
					cx={xAt(i)}
					cy={yAt(p.kg)}
					r={i === sorted.length - 1 ? 2.6 : 1.8}
					fill={i === sorted.length - 1 ? 'var(--color-ember)' : 'var(--color-bg-0)'}
					stroke="var(--color-ember-soft)"
					stroke-width="1"
					opacity={i === sorted.length - 1 ? 1 : 0.65}
				/>
			{/each}

			<!-- Axis tick marks (visual only) -->
			{#each axisTicks as t (t.x + t.label)}
				<line
					x1={t.x}
					x2={t.x}
					y1={H - PAD_B}
					y2={H - PAD_B + 4}
					stroke="var(--color-border-default)"
					stroke-width="1"
					opacity="0.7"
				/>
			{/each}
		</svg>

		<div class="axis">
			{#each axisTicks as t (t.x + t.label)}
				<span class="ax-label" style="left: {(t.x / W) * 100}%">{t.label}</span>
			{/each}
		</div>
	{/if}
</div>

<style>
	.chart-host {
		position: relative;
		width: 100%;
	}

	.empty {
		display: grid;
		place-items: center;
		min-height: 140px;
	}

	.empty-text {
		font-family: var(--font-display);
		font-style: italic;
		font-variation-settings: 'opsz' 24, 'SOFT' 100, 'wght' 380, 'ital' 1;
		font-size: 14px;
		color: var(--color-text-faint);
	}

	svg {
		display: block;
		width: 100%;
		max-height: 220px;
	}

	.target-label {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-feature-settings: 'tnum' 1;
	}

	.axis {
		position: relative;
		height: 14px;
		margin-top: 2px;
	}

	.ax-label {
		position: absolute;
		transform: translateX(-50%);
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-text-faint);
		white-space: nowrap;
	}
</style>
