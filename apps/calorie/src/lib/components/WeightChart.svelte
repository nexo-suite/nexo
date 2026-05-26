<script lang="ts">
	import { Plus, TrendingDown, TrendingUp } from '@lucide/svelte';
	import type { WeightLog } from '$lib/types';
	import { m } from '$lib/paraglide/messages.js';

	let {
		logs,
		height = 160,
		onLogToday
	}: {
		logs: WeightLog[];
		height?: number;
		onLogToday?: () => void;
	} = $props();

	const W = 600;
	const H = $derived(height);
	const PAD_T = 30;
	const PAD_B = 16;
	const PAD_X = 12;

	const sorted = $derived([...logs].sort((a, b) => a.date.localeCompare(b.date)));

	// 7-day rolling average — main trend line
	const avg = $derived.by(() => {
		const win = 7;
		return sorted.map((_, i) => {
			const slice = sorted.slice(Math.max(0, i - win + 1), i + 1);
			const sum = slice.reduce((s, l) => s + l.kg, 0);
			return slice.length ? sum / slice.length : sorted[i].kg;
		});
	});

	const latest = $derived(sorted[sorted.length - 1]?.kg ?? 0);
	const oldest = $derived(sorted[0]?.kg ?? 0);
	const delta = $derived(latest - oldest);

	const range = $derived.by(() => {
		if (sorted.length === 0) return { min: 0, max: 1 };
		const all = sorted.map((l) => l.kg);
		const min = Math.min(...all);
		const max = Math.max(...all);
		const pad = (max - min) * 0.18 || 0.5;
		return { min: min - pad, max: max + pad };
	});

	function xAt(i: number): number {
		if (sorted.length <= 1) return W / 2;
		return PAD_X + (i / (sorted.length - 1)) * (W - 2 * PAD_X);
	}

	function yAt(kg: number): number {
		const span = range.max - range.min || 1;
		return PAD_T + (1 - (kg - range.min) / span) * (H - PAD_T - PAD_B);
	}

	// Smoothed quadratic path through the rolling-avg points.
	// Uses simple midpoint quad-curves: M p0 Q p1, midpoint(p1, p2) ... T points.
	const trendPath = $derived.by(() => {
		if (avg.length === 0) return '';
		if (avg.length === 1) return `M ${xAt(0)} ${yAt(avg[0])}`;
		let d = `M ${xAt(0).toFixed(2)} ${yAt(avg[0]).toFixed(2)}`;
		for (let i = 1; i < avg.length - 1; i++) {
			const cx = xAt(i);
			const cy = yAt(avg[i]);
			const nx = (xAt(i) + xAt(i + 1)) / 2;
			const ny = (yAt(avg[i]) + yAt(avg[i + 1])) / 2;
			d += ` Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${nx.toFixed(2)} ${ny.toFixed(2)}`;
		}
		const last = avg.length - 1;
		d += ` T ${xAt(last).toFixed(2)} ${yAt(avg[last]).toFixed(2)}`;
		return d;
	});

	const areaPath = $derived(
		trendPath ? `${trendPath} L ${xAt(avg.length - 1)} ${H - PAD_B} L ${xAt(0)} ${H - PAD_B} Z` : ''
	);

	const isDown = $derived(delta < 0);
</script>

<div class="chart-card">
	<header class="head">
		<div class="latest-block">
			<div class="latest-num tnum">
				{latest.toFixed(1)}
				<span class="latest-unit">kg</span>
			</div>
			{#if sorted.length > 1}
				<div class="delta" class:down={isDown} class:up={!isDown && delta > 0}>
					{#if isDown}
						<TrendingDown size={11} strokeWidth={1.8} />
					{:else if delta > 0}
						<TrendingUp size={11} strokeWidth={1.8} />
					{/if}
					<span class="delta-num tnum">
						{delta > 0 ? '+' : ''}{delta.toFixed(1)} kg
					</span>
					<span class="delta-since">{m.history_since_oldest()}</span>
				</div>
			{/if}
		</div>

		<button class="log-btn" type="button" onclick={() => onLogToday?.()}>
			<Plus size={13} strokeWidth={1.9} />
			<span>{m.history_log_today()}</span>
		</button>
	</header>

	<div class="chart-host">
		<svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" width="100%" height={H}>
			<defs>
				<linearGradient id="weight-area" x1="0%" y1="0%" x2="0%" y2="100%">
					<stop offset="0%" stop-color="var(--color-ember)" stop-opacity="0.18" />
					<stop offset="100%" stop-color="var(--color-ember)" stop-opacity="0" />
				</linearGradient>
			</defs>

			<!-- Horizontal grid lines at 25/50/75 -->
			{#each [0.25, 0.5, 0.75] as q (q)}
				<line
					x1={PAD_X}
					x2={W - PAD_X}
					y1={PAD_T + q * (H - PAD_T - PAD_B)}
					y2={PAD_T + q * (H - PAD_T - PAD_B)}
					stroke="var(--color-border-subtle)"
					stroke-width="1"
					stroke-dasharray="2 4"
					opacity="0.6"
				/>
			{/each}

			{#if areaPath}
				<path d={areaPath} fill="url(#weight-area)" />
			{/if}
			{#if trendPath}
				<path
					d={trendPath}
					fill="none"
					stroke="var(--color-ember)"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			{/if}

			<!-- Daily dots -->
			{#each sorted as l, i (l.date)}
				<circle
					cx={xAt(i)}
					cy={yAt(l.kg)}
					r="2.2"
					fill="var(--color-bg-0)"
					stroke="var(--color-ember-soft)"
					stroke-width="1.2"
					opacity={i === sorted.length - 1 ? 1 : 0.65}
				/>
			{/each}
		</svg>
	</div>
</div>

<style>
	.chart-card {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 4px 4px 0;
	}

	.latest-block {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.latest-num {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variant-numeric: tabular-nums lining-nums;
		font-variation-settings: 'opsz' 96, 'SOFT' 90, 'wght' 470;
		font-size: 38px;
		line-height: 0.95;
		letter-spacing: -0.035em;
		color: var(--color-text-primary);
	}

	.latest-unit {
		font-size: 16px;
		opacity: 0.55;
		font-variation-settings: 'opsz' 24, 'wght' 420;
		margin-left: 2px;
	}

	.delta {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
		font-family: var(--font-mono);
		color: var(--color-text-faint);
		letter-spacing: 0.03em;
	}

	.delta.down {
		color: var(--color-ontarget);
	}

	.delta.up {
		color: var(--color-overtarget);
	}

	.delta-num {
		font-family: var(--font-mono);
		font-feature-settings: 'tnum' 1;
	}

	.delta-since {
		opacity: 0.7;
		text-transform: lowercase;
	}

	.log-btn {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 7px 12px 7px 10px;
		border-radius: 999px;
		background: var(--ember-tint-bg);
		color: var(--color-ember-deep);
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-weight: 500;
		transition:
			background 160ms,
			transform 100ms;
	}

	.log-btn:active {
		background: color-mix(in oklab, var(--color-ember) 18%, var(--color-bg-0));
		transform: scale(0.96);
	}

	.chart-host {
		margin-top: 4px;
	}
</style>
