<script lang="ts">
	import { ChevronRight, CheckCircle } from '@lucide/svelte';
	import { formatCurrency, getIntlLocale } from '$lib/utils';
	import { m } from '$lib/paraglide/messages.js';
	import type { Income } from '$lib/types';

	let {
		income,
		once = false,
		hideCents = false,
		onEdit
	}: {
		income: Income;
		once?: boolean;
		hideCents?: boolean;
		onEdit?: (i: Income) => void;
	} = $props();

	const fmt = (n: number) => formatCurrency(n, 'EUR', hideCents);
</script>

<button
	type="button"
	onclick={() => onEdit?.(income)}
	class="bg-surface-1 flex w-full items-center gap-3 rounded-lg border px-[14px] py-[11px] text-left shadow-sm transition-colors
	       {once
		? 'border-border-default hover:border-income/40 border-dashed'
		: 'border-border-default hover:border-income/30'}
	       {once && income.received ? 'opacity-60' : ''}"
>
	<div
		class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
		style="background-color: color-mix(in oklab, var(--color-income) 10%, transparent);"
	>
		{income.received ? '✅' : '⏳'}
	</div>
	<div class="min-w-0 flex-1">
		<p class="truncate text-[14px] font-medium {once && income.received ? 'line-through' : ''}">
			{income.name}
		</p>
		<p class="text-text-subtle text-[11px] capitalize">
			{#if once}
				{#if income.expectedDate}
					{m.income_row_due_on({
						date: new Date(income.expectedDate).toLocaleDateString(getIntlLocale(), {
							day: 'numeric',
							month: 'short'
						})
					})}
				{:else}
					{m.income_row_one_time()}
				{/if}
				{#if income.received}<span class="text-income">{m.income_row_received_dot()}</span>{/if}
			{:else}
				{income.recurrence}
				{#if income.expectedDate}
					· {m.income_row_due_on({
						date: new Date(income.expectedDate).toLocaleDateString(getIntlLocale(), {
							day: 'numeric',
							month: 'short'
						})
					})}{/if}
			{/if}
		</p>
	</div>
	<div class="flex items-center gap-1">
		{#if income.received}
			<CheckCircle size={14} style="color: var(--color-income);" />
		{/if}
		<p class="text-income text-[14px] font-semibold tabular-nums">
			{fmt(income.amount)}
		</p>
		<ChevronRight size={14} class="text-text-subtle" />
	</div>
</button>
