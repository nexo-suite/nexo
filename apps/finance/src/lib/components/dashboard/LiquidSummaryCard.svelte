<script lang="ts">
	import { formatCurrency } from '$lib/utils';
	import { m } from '$lib/paraglide/messages.js';

	let {
		accounts,
		monthlyExpenses,
		monthlyIncome,
		currency
	}: {
		accounts: { balance: number; includeInTotal: boolean }[];
		monthlyExpenses: number;
		monthlyIncome: number;
		currency: string;
	} = $props();

	const totalLiquid = $derived(
		accounts.filter((a) => a.includeInTotal).reduce((sum, a) => sum + a.balance, 0)
	);

	const netCashflow = $derived(monthlyIncome - monthlyExpenses);
	const savingsRate = $derived(
		monthlyIncome > 0 ? Math.max(0, Math.min(100, (netCashflow / monthlyIncome) * 100)) : 0
	);
	const fmt = (n: number) => formatCurrency(n, currency);
</script>

<div
	class="bg-primary-500 shadow-primary-500/20 relative overflow-hidden rounded-3xl p-6 shadow-xl"
>
	<!-- Decorative circles -->
	<div class="pointer-events-none absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/5"></div>
	<div
		class="pointer-events-none absolute -bottom-6 -left-4 h-28 w-28 rounded-full bg-white/5"
	></div>

	<p class="text-[11px] font-semibold tracking-widest text-white/60 uppercase">{m.liquid_assets()}</p>
	<p class="mt-1 text-[2.75rem] leading-none font-semibold tracking-tight text-white">
		{fmt(totalLiquid)}
	</p>

	<div class="mt-6 grid grid-cols-3 gap-2 border-t border-white/15 pt-5">
		<div>
			<p class="text-[10px] font-medium tracking-wider text-white/50 uppercase">{m.liquid_this_month_in()}</p>
			<p class="mt-1 text-base font-semibold text-white">{fmt(monthlyIncome)}</p>
		</div>
		<div>
			<p class="text-[10px] font-medium tracking-wider text-white/50 uppercase">{m.liquid_this_month_out()}</p>
			<p class="mt-1 text-base font-semibold text-white">{fmt(monthlyExpenses)}</p>
		</div>
		<div>
			<p class="text-[10px] font-medium tracking-wider text-white/50 uppercase">{m.liquid_net()}</p>
			<p
				class="mt-1 text-base font-semibold {netCashflow >= 0
					? 'text-emerald-300'
					: 'text-red-300'}"
			>
				{fmt(netCashflow)}
			</p>
		</div>
	</div>

	{#if monthlyIncome > 0}
		<div class="mt-4">
			<div class="mb-1.5 flex items-center justify-between">
				<p class="text-[10px] font-medium tracking-wider text-white/50 uppercase">
					{m.liquid_saved_this_month()}
				</p>
				<p class="text-[10px] font-semibold text-white/70">{savingsRate.toFixed(0)}%</p>
			</div>
			<div class="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
				<div
					class="h-full rounded-full transition-all duration-500 {netCashflow >= 0
						? 'bg-emerald-300'
						: 'bg-red-400'}"
					style="width: {netCashflow >= 0
						? savingsRate
						: Math.min(100, (Math.abs(netCashflow) / monthlyIncome) * 100)}%"
				></div>
			</div>
		</div>
	{/if}
</div>
