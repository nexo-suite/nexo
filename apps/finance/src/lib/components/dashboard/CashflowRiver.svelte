<script lang="ts">
	import { getIntlLocale } from '$lib/utils';
	import { m } from '$lib/paraglide/messages.js';

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

	// Emoji + verdict for saved%
	const verdict = $derived.by(() => {
		if (monthlyIncome === 0) return { emoji: '🌱', text: m.cashflow_verdict_no_income() };
		if (savedPct < 0)
			return { emoji: '🔥', text: m.cashflow_verdict_burning({ pct: Math.abs(savedPct) }) };
		if (savedPct < 5) return { emoji: '😅', text: m.cashflow_verdict_thin() };
		if (savedPct < 15) return { emoji: '🙂', text: m.cashflow_verdict_okay({ pct: savedPct }) };
		if (savedPct < 30) return { emoji: '✨', text: m.cashflow_verdict_solid({ pct: savedPct }) };
		return { emoji: '🚀', text: m.cashflow_verdict_chefs_kiss({ pct: savedPct }) };
	});
</script>

<div
	class="border-border-default bg-surface-1 relative overflow-hidden rounded-[var(--radius-xl)] border"
	style="padding: 16px 18px 18px;"
>
	<!-- Subtle bg sheen -->
	<div
		class="pointer-events-none absolute inset-0"
		style="background: radial-gradient(circle at 100% 0%, color-mix(in oklab, var(--color-accent) 6%, transparent), transparent 55%); opacity: 0.7;"
	></div>

	<!-- Header row -->
	<div class="relative flex items-center justify-between">
		<span class="text-text-primary text-[13px] font-medium">
			{m.cashflow_pulse_title({ month: monthLabel })}
		</span>
		<span
			class="mono text-[11px] tracking-wide tabular-nums"
			style="color: {savedPct < 0 ? 'var(--expense-ink)' : 'var(--accent-ink)'};"
		>
			{net >= 0 ? '+' : ''}{fmt(net)}
		</span>
	</div>

	<!-- Verdict line -->
	<div class="relative mt-1.5 flex items-center gap-1.5">
		<span class="text-[14px] leading-none" aria-hidden="true">{verdict.emoji}</span>
		<span class="text-text-muted text-[12.5px]">{verdict.text}</span>
	</div>

	<!-- Stacked bar -->
	<div
		class="bg-bg-2 relative mt-3.5 flex h-3 w-full overflow-hidden rounded-full"
		style="box-shadow: inset 0 0 0 1px var(--color-border-subtle);"
	>
		<div
			class="h-full rounded-l-full transition-[width] duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
			style="width: {incomePct}%; background: linear-gradient(90deg, var(--color-income), color-mix(in oklab, var(--color-income) 70%, #34d399));"
		></div>
		<div class="bg-surface-1 absolute top-0 h-full w-0.5" style="left: {incomePct}%;"></div>
		<div
			class="h-full flex-1 rounded-r-full"
			style="background: linear-gradient(90deg, var(--color-expense), color-mix(in oklab, var(--color-expense) 70%, #fb923c));"
		></div>
	</div>

	<!-- Legend -->
	<div class="relative mt-3 grid grid-cols-3 gap-2">
		<div class="flex items-center gap-1.5">
			<span class="text-[12px]" aria-hidden="true">💰</span>
			<span class="text-text-muted text-[11.5px]">{m.cashflow_in()}</span>
			<span
				class="mono ml-auto text-[11.5px] font-medium tabular-nums"
				style="color: var(--income-ink);">{fmt(monthlyIncome)}</span
			>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="text-[12px]" aria-hidden="true">💸</span>
			<span class="text-text-muted text-[11.5px]">{m.cashflow_out()}</span>
			<span
				class="mono ml-auto text-[11.5px] font-medium tabular-nums"
				style="color: var(--expense-ink);">{fmt(monthlyExpenses)}</span
			>
		</div>
		<div class="flex items-center gap-1.5">
			<span class="text-[12px]" aria-hidden="true">🏦</span>
			<span class="text-text-muted text-[11.5px]">{m.cashflow_net()}</span>
			<span class="mono text-text-primary ml-auto text-[11.5px] font-medium tabular-nums"
				>{fmt(net)}</span
			>
		</div>
	</div>
</div>
