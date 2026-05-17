<script lang="ts">
	import { ChevronRight } from 'lucide-svelte';
	import { formatCurrency, getIntlLocale, normalizeToMonthly } from '$lib/utils';
	import type { Expense } from '$lib/types';

	const CATEGORY_ICONS: Record<string, string> = {
		housing: '🏠',
		utilities: '⚡',
		subscription: '🔄',
		insurance: '🛡️',
		food: '🍽️',
		transport: '🚌',
		other: '📌'
	};

	const BREAKDOWN_LABEL: Record<string, string> = {
		weekly: '× 52 weeks ÷ 12',
		biweekly: '× 26 fortnights ÷ 12',
		quarterly: '÷ 3 months',
		'half-yearly': '÷ 6 months',
		yearly: '÷ 12 months'
	};

	let {
		expense,
		once = false,
		hideCents = false,
		onEdit
	}: {
		expense: Expense;
		once?: boolean;
		hideCents?: boolean;
		onEdit?: (e: Expense) => void;
	} = $props();

	const isPaid = $derived(once && !expense.active);
	const fmt = (n: number) => formatCurrency(n, 'EUR', hideCents);

	const showMonthly = $derived(!once && !['monthly', 'once'].includes(expense.recurrence));
	const monthlyEquiv = $derived(normalizeToMonthly(expense.amount, expense.recurrence));

	let breakdownOpen = $state(false);
</script>

<div
	class="bg-surface-1 flex w-full items-center gap-3 rounded-lg border text-left shadow-sm transition-colors
	       {once ? 'border-border-default border-dashed' : 'border-border-default'}
	       {isPaid ? 'opacity-60' : ''}"
>
	<button
		type="button"
		onclick={() => onEdit?.(expense)}
		class="flex min-w-0 flex-1 items-center gap-3 px-[14px] py-[11px] transition-opacity hover:opacity-80"
	>
		<div
			class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
			style="background-color: color-mix(in oklab, var(--color-expense) 10%, transparent);"
		>
			{once ? (isPaid ? '✅' : '🗓️') : (CATEGORY_ICONS[expense.category] ?? '📌')}
		</div>
		<div class="min-w-0 flex-1">
			<p class="truncate text-[14px] font-medium {isPaid ? 'line-through' : ''}">{expense.name}</p>
			<p class="text-text-subtle text-[11px] capitalize">
				{#if once}
					{#if expense.dueDate}
						due {new Date(expense.dueDate).toLocaleDateString(getIntlLocale(), {
							day: 'numeric',
							month: 'short'
						})}
					{:else}
						one-time
					{/if}
					{#if isPaid}<span class="text-income"> · paid</span>{/if}
				{:else}
					{expense.category} · {expense.recurrence}
					{#if !expense.active}<span> · paused</span>{/if}
				{/if}
			</p>
		</div>
	</button>
	<div class="flex shrink-0 items-center gap-1 pr-[14px]">
		<div class="text-right">
			<p class="text-expense text-[14px] font-semibold tabular-nums">
				{fmt(expense.amount)}
			</p>
			{#if showMonthly}
				<button
					type="button"
					onclick={() => (breakdownOpen = !breakdownOpen)}
					class="text-text-subtle hover:text-expense text-[10px] tabular-nums transition-colors"
				>
					{fmt(monthlyEquiv)}/mo
				</button>
			{/if}
		</div>
		<button type="button" onclick={() => onEdit?.(expense)}>
			<ChevronRight size={14} class="text-text-subtle" />
		</button>
	</div>
</div>

{#if breakdownOpen}
	<div class="border-border-default bg-bg-1 mx-1 -mt-1 rounded-b-lg border border-t-0 px-4 py-3">
		<p class="text-text-subtle mb-2 text-[11px] font-semibold tracking-wider uppercase">
			Monthly breakdown
		</p>
		<div class="flex items-center justify-between text-xs">
			<span class="text-text-subtle"
				>{fmt(expense.amount)} {BREAKDOWN_LABEL[expense.recurrence]}</span
			>
			<span class="text-expense font-semibold tabular-nums">= {fmt(monthlyEquiv)}/mo</span>
		</div>
	</div>
{/if}
