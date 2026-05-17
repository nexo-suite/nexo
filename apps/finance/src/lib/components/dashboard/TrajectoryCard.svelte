<script lang="ts">
	import { TrendingUp } from 'lucide-svelte';
	import { getIntlLocale } from '$lib/utils';

	let {
		liquidBalance,
		trajectory,
		currency
	}: {
		liquidBalance: number;
		trajectory: number[];
		currency: string;
	} = $props();

	const rangeDays: Record<string, number> = { '30D': 30, '90D': 90, '1Y': 365 };
	let selectedRange = $state<'30D' | '90D' | '1Y'>('90D');

	const displayTrajectory = $derived(trajectory.slice(0, rangeDays[selectedRange]));

	const endValue = $derived(displayTrajectory[displayTrajectory.length - 1] ?? liquidBalance);
	const delta = $derived(endValue - liquidBalance);

	const lowestValue = $derived(Math.min(...displayTrajectory));
	const lowestDay = $derived(displayTrajectory.indexOf(lowestValue));
	const lowestDate = $derived(
		new Date(Date.now() + lowestDay * 86400000).toISOString().slice(0, 10)
	);
	const endDate = $derived(
		new Date(Date.now() + (displayTrajectory.length - 1) * 86400000).toISOString().slice(0, 10)
	);

	const rangeLabel = $derived(selectedRange === '1Y' ? '1y' : selectedRange.toLowerCase());

	function fmt(n: number) {
		return new Intl.NumberFormat(getIntlLocale(), {
			style: 'currency',
			currency,
			maximumFractionDigits: 0
		}).format(n);
	}

	function fmtDate(d: string) {
		return new Date(d).toLocaleDateString(getIntlLocale(), { day: 'numeric', month: 'short' });
	}

	const currencySymbol = $derived(
		new Intl.NumberFormat(getIntlLocale(), { style: 'currency', currency })
			.formatToParts(0)
			.find((p) => p.type === 'currency')?.value ?? '€'
	);

	const integerPart = $derived(Math.floor(Math.abs(liquidBalance)).toLocaleString(getIntlLocale()));
	const centsPart = $derived(
		Math.abs(Math.round((liquidBalance % 1) * 100))
			.toString()
			.padStart(2, '0')
	);
	const isNegative = $derived(liquidBalance < 0);

	// SVG sparkline generation
	const svgWidth = 400;
	const svgHeight = 132;
	const padding = { top: 12, bottom: 12, left: 0, right: 0 };

	const chartPoints = $derived.by(() => {
		if (displayTrajectory.length < 2) return '';
		const min = Math.min(...displayTrajectory);
		const max = Math.max(...displayTrajectory);
		const range = max - min || 1;
		const w = svgWidth - padding.left - padding.right;
		const h = svgHeight - padding.top - padding.bottom;

		return displayTrajectory
			.map((val, i) => {
				const x = padding.left + (i / (displayTrajectory.length - 1)) * w;
				const y = padding.top + h - ((val - min) / range) * h;
				return `${x},${y}`;
			})
			.join(' ');
	});

	const fillPath = $derived.by(() => {
		if (displayTrajectory.length < 2) return '';
		const min = Math.min(...displayTrajectory);
		const max = Math.max(...displayTrajectory);
		const range = max - min || 1;
		const w = svgWidth - padding.left - padding.right;
		const h = svgHeight - padding.top - padding.bottom;

		const points = displayTrajectory.map((val, i) => {
			const x = padding.left + (i / (displayTrajectory.length - 1)) * w;
			const y = padding.top + h - ((val - min) / range) * h;
			return { x, y };
		});

		let d = `M ${points[0].x},${points[0].y}`;
		for (let i = 1; i < points.length; i++) {
			d += ` L ${points[i].x},${points[i].y}`;
		}
		d += ` L ${points[points.length - 1].x},${svgHeight}`;
		d += ` L ${points[0].x},${svgHeight} Z`;
		return d;
	});

	const lowestPoint = $derived.by(() => {
		if (displayTrajectory.length < 2) return { x: 0, y: 0 };
		const min = Math.min(...displayTrajectory);
		const max = Math.max(...displayTrajectory);
		const range = max - min || 1;
		const w = svgWidth - padding.left - padding.right;
		const h = svgHeight - padding.top - padding.bottom;
		const idx = displayTrajectory.indexOf(min);
		return {
			x: padding.left + (idx / (displayTrajectory.length - 1)) * w,
			y: padding.top + h - ((min - min) / range) * h
		};
	});

	const endPoint = $derived.by(() => {
		if (displayTrajectory.length < 2) return { x: 0, y: 0 };
		const min = Math.min(...displayTrajectory);
		const max = Math.max(...displayTrajectory);
		const range = max - min || 1;
		const w = svgWidth - padding.left - padding.right;
		const h = svgHeight - padding.top - padding.bottom;
		const last = displayTrajectory[displayTrajectory.length - 1];
		return {
			x: padding.left + w,
			y: padding.top + h - ((last - min) / range) * h
		};
	});
</script>

<div
	class="border-border-default bg-surface-1 relative overflow-hidden rounded-[var(--radius-2xl)] border"
	style="padding: 18px;"
>
	<!-- Accent gradient wash -->
	<div
		class="pointer-events-none absolute top-0 left-0 h-32 w-32"
		style="background: radial-gradient(circle at 0% 0%, var(--accent-glow) 0%, transparent 70%); opacity: 0.5;"
	></div>

	<!-- Top row -->
	<div class="relative flex items-center justify-between">
		<div class="flex items-center gap-2">
			<span
				class="bg-accent inline-block h-2 w-2 rounded-full"
				style="animation: pulse-dot 2s ease-in-out infinite;"
			></span>
			<span class="mono text-text-subtle text-[10px] tracking-[0.12em] uppercase">
				Liquid · Today
			</span>
		</div>
		<div class="flex gap-1">
			{#each ['30D', '90D', '1Y'] as range (range)}
				<button
					type="button"
					class="mono rounded-[var(--radius-sm)] px-2 py-0.5 text-[9px] tracking-wider uppercase transition-colors
					{range === selectedRange
						? 'bg-bg-2 text-text-primary font-medium'
						: 'text-text-faint hover:text-text-muted'}"
					onclick={() => (selectedRange = range as typeof selectedRange)}
				>
					{range}
				</button>
			{/each}
		</div>
	</div>

	<!-- Big balance -->
	<div class="relative mt-3 flex items-baseline gap-1">
		{#if isNegative}<span class="text-text-muted text-[22px] font-semibold">-</span>{/if}
		<span class="text-text-muted text-[22px]">{currencySymbol}</span>
		<span class="text-text-primary text-[44px] leading-none font-semibold tracking-tight"
			>{integerPart}</span
		>
		<span class="text-text-muted text-[22px]">,{centsPart}</span>
	</div>

	<!-- Delta pill + projected -->
	<div class="relative mt-2 flex items-center gap-2.5">
		{#if delta >= 0}
			<span
				class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
				style="background: var(--accent-soft); color: var(--accent-ink);"
			>
				<TrendingUp size={11} stroke-width={2.5} />
				+{fmt(delta)}
			</span>
		{:else}
			<span
				class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
				style="background: var(--expense-soft); color: var(--expense-ink);"
			>
				{fmt(delta)}
			</span>
		{/if}
		<span class="text-text-faint text-[11.5px]">
			projected to {fmt(endValue)} by {fmtDate(endDate)}
		</span>
	</div>

	<!-- SVG Sparkline -->
	{#if displayTrajectory.length >= 2}
		<div class="relative mt-4">
			<svg
				viewBox="0 0 {svgWidth} {svgHeight}"
				class="w-full"
				style="height: 132px;"
				preserveAspectRatio="none"
			>
				<defs>
					<linearGradient id="traj-fill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.18" />
						<stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0.02" />
					</linearGradient>
				</defs>
				<!-- Fill area -->
				<path d={fillPath} fill="url(#traj-fill)" />
				<!-- Line -->
				<polyline
					points={chartPoints}
					fill="none"
					stroke="var(--color-accent)"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<!-- Lowest point (red) -->
				<circle cx={lowestPoint.x} cy={lowestPoint.y} r="4" fill="var(--color-expense)" />
				<circle
					cx={lowestPoint.x}
					cy={lowestPoint.y}
					r="7"
					fill="var(--color-expense)"
					opacity="0.15"
				/>
				<!-- End point (green) -->
				<circle cx={endPoint.x} cy={endPoint.y} r="4" fill="var(--color-accent)" />
				<circle cx={endPoint.x} cy={endPoint.y} r="7" fill="var(--color-accent)" opacity="0.15" />
			</svg>
		</div>
	{/if}

	<!-- Footer 3-column -->
	<div class="relative mt-3 grid grid-cols-3 gap-2">
		<div>
			<p class="mono text-text-faint text-[9px] tracking-[0.12em] uppercase">Today</p>
			<p class="text-text-primary mt-0.5 text-[14px] font-semibold">{fmt(liquidBalance)}</p>
			<p class="text-text-subtle text-[10.5px]">{fmtDate(new Date().toISOString())}</p>
		</div>
		<div class="text-center">
			<p class="mono text-text-faint text-[9px] tracking-[0.12em] uppercase">Lowest</p>
			<p class="mt-0.5 text-[14px] font-semibold" style="color: var(--expense-ink);">
				{fmt(lowestValue)}
			</p>
			<p class="text-text-subtle text-[10.5px]">{fmtDate(lowestDate)}</p>
		</div>
		<div class="text-right">
			<p class="mono text-text-faint text-[9px] tracking-[0.12em] uppercase">In {rangeLabel}</p>
			<p class="mt-0.5 text-[14px] font-semibold" style="color: var(--accent-ink);">
				{fmt(endValue)}
			</p>
			<p class="text-text-subtle text-[10.5px]">{fmtDate(endDate)}</p>
		</div>
	</div>
</div>
