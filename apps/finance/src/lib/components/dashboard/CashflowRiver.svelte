<script lang="ts">
	import { getIntlLocale } from '$lib/utils';

	let {
		monthlyIncome,
		monthlyExpenses,
		currency
	}: {
		monthlyIncome: number;
		monthlyExpenses: number;
		currency: string;
	} = $props();

	function fmt(n: number) {
		return new Intl.NumberFormat(getIntlLocale(), {
			style: 'currency',
			currency,
			maximumFractionDigits: 0
		}).format(n);
	}

	const net = $derived(monthlyIncome - monthlyExpenses);
	const savedPct = $derived(monthlyIncome > 0 ? Math.round((net / monthlyIncome) * 100) : 0);
	const total = $derived(monthlyIncome + monthlyExpenses);
	const incomePct = $derived(total > 0 ? (monthlyIncome / total) * 100 : 50);

	const monthLabel = $derived(new Date().toLocaleDateString(getIntlLocale(), { month: 'long' }));
</script>

<div
	class="border-border-default bg-surface-1 rounded-[var(--radius-xl)] border"
	style="padding: 16px 18px 18px;"
>
	<!-- Header row -->
	<div class="flex items-center justify-between">
		<span class="text-text-primary text-[13px] font-medium">
			{monthLabel} · in & out
		</span>
		<span class="mono text-[11px] tracking-wide" style="color: var(--accent-ink);">
			{fmt(net)} saved · {savedPct}%
		</span>
	</div>

	<!-- Stacked horizontal bar -->
	<div class="bg-bg-2 relative mt-3 flex h-3 w-full overflow-hidden rounded-full">
		<!-- Income segment -->
		<div
			class="h-full rounded-l-full"
			style="width: {incomePct}%; background: linear-gradient(90deg, var(--color-income), color-mix(in oklab, var(--color-income) 70%, #34d399));"
		></div>
		<!-- Boundary marker -->
		<div class="bg-surface-1 absolute top-0 h-full w-0.5" style="left: {incomePct}%;"></div>
		<!-- Expense segment -->
		<div
			class="h-full flex-1 rounded-r-full"
			style="background: linear-gradient(90deg, var(--color-expense), color-mix(in oklab, var(--color-expense) 70%, #fb923c));"
		></div>
	</div>

	<!-- Legend -->
	<div class="mt-3 grid grid-cols-3 gap-2">
		<div class="flex items-center gap-1.5">
			<span class="inline-block h-2 w-2 rounded-full" style="background: var(--color-income);"
			></span>
			<span class="text-text-muted text-[11.5px]">In</span>
			<span class="mono text-text-primary ml-auto text-[11.5px] font-medium"
				>{fmt(monthlyIncome)}</span
			>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="inline-block h-2 w-2 rounded-full" style="background: var(--color-expense);"
			></span>
			<span class="text-text-muted text-[11.5px]">Out</span>
			<span class="mono text-text-primary ml-auto text-[11.5px] font-medium"
				>{fmt(monthlyExpenses)}</span
			>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="bg-text-primary inline-block h-2 w-2 rounded-full"></span>
			<span class="text-text-muted text-[11.5px]">Net</span>
			<span class="mono text-text-primary ml-auto text-[11.5px] font-medium">{fmt(net)}</span>
		</div>
	</div>
</div>
