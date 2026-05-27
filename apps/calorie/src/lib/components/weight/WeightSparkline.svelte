<script lang="ts">
	import type { WeightPoint } from '$lib/utils/weightStats';

	let {
		points,
		targetKg
	}: {
		points: WeightPoint[];
		targetKg: number | null;
	} = $props();

	const W = 600;
	const H = 56;
	const PAD_X = 4;
	const PAD_Y = 10;

	const sorted = $derived([...points].sort((a, b) => a.date.localeCompare(b.date)));

	// Last 60 days max — keeps the line readable as a "feel" graphic, not a chart
	const trimmed = $derived(sorted.length > 60 ? sorted.slice(-60) : sorted);

	const yRange = $derived.by(() => {
		if (trimmed.length === 0) return { min: 0, max: 1 };
		const all = trimmed.map((p) => p.kg);
		if (targetKg != null) all.push(targetKg);
		const lo = Math.min(...all);
		const hi = Math.max(...all);
		const pad = Math.max(0.4, (hi - lo) * 0.25);
		return { min: lo - pad, max: hi + pad };
	});

	const xRange = $derived.by(() => {
		if (trimmed.length === 0) return null;
		const first = Date.parse(`${trimmed[0].date}T00:00:00Z`);
		const last = Date.parse(`${trimmed[trimmed.length - 1].date}T00:00:00Z`);
		return { first, last, span: Math.max(1, last - first) };
	});

	function xAt(i: number): number {
		if (!xRange || trimmed.length <= 1) return W / 2;
		const ms = Date.parse(`${trimmed[i].date}T00:00:00Z`);
		const t = (ms - xRange.first) / xRange.span;
		return PAD_X + t * (W - 2 * PAD_X);
	}

	function yAt(kg: number): number {
		const span = yRange.max - yRange.min || 1;
		return PAD_Y + (1 - (kg - yRange.min) / span) * (H - 2 * PAD_Y);
	}

	const path = $derived.by(() => {
		if (trimmed.length === 0) return '';
		if (trimmed.length === 1) return `M ${xAt(0)} ${yAt(trimmed[0].kg)}`;
		let d = `M ${xAt(0).toFixed(2)} ${yAt(trimmed[0].kg).toFixed(2)}`;
		for (let i = 1; i < trimmed.length; i++) {
			d += ` L ${xAt(i).toFixed(2)} ${yAt(trimmed[i].kg).toFixed(2)}`;
		}
		return d;
	});

	const targetY = $derived(targetKg != null ? yAt(targetKg) : null);
	const lastIdx = $derived(trimmed.length - 1);
</script>

{#if trimmed.length >= 2}
	<svg
		class="spark"
		viewBox="0 0 {W} {H}"
		preserveAspectRatio="none"
		role="img"
		aria-hidden="true"
	>
		{#if targetY != null}
			<line
				x1={PAD_X}
				x2={W - PAD_X}
				y1={targetY}
				y2={targetY}
				stroke="var(--color-ember)"
				stroke-width="1"
				stroke-dasharray="2 4"
				opacity="0.45"
			/>
		{/if}
		<path
			d={path}
			fill="none"
			stroke="var(--color-text-muted)"
			stroke-width="1.2"
			stroke-linecap="round"
			stroke-linejoin="round"
			opacity="0.55"
		/>
		<circle
			cx={xAt(lastIdx)}
			cy={yAt(trimmed[lastIdx].kg)}
			r="2.6"
			fill="var(--color-ember)"
		/>
		<circle
			cx={xAt(lastIdx)}
			cy={yAt(trimmed[lastIdx].kg)}
			r="6"
			fill="var(--color-ember)"
			opacity="0.18"
		/>
	</svg>
{/if}

<style>
	.spark {
		display: block;
		width: 100%;
		height: 56px;
	}
</style>
