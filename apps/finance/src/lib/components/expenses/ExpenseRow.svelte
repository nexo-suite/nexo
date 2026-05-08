<script lang="ts">
	import { ChevronRight } from 'lucide-svelte';
	import { formatCurrency, normalizeToMonthly } from '$lib/utils';
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
		onEdit
	}: { expense: Expense; once?: boolean; onEdit?: (e: Expense) => void } = $props();

	const isPaid = $derived(once && !expense.active);
	const fmt = (n: number) => formatCurrency(n);

	const showMonthly = $derived(!once && !['monthly', 'once'].includes(expense.recurrence));
	const monthlyEquiv = $derived(normalizeToMonthly(expense.amount, expense.recurrence));

	let breakdownOpen = $state(false);
</script>

<div
	class="flex w-full items-center gap-3 rounded-lg border bg-surface text-left shadow-sm transition-colors
	       {once ? 'border-dashed border-border' : 'border-border'}
	       {isPaid ? 'opacity-60' : ''}"
>
	<button
		type="button"
		onclick={() => onEdit?.(expense)}
		class="flex min-w-0 flex-1 items-center gap-3 p-4 transition-opacity hover:opacity-80"
	>
		<div
			class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-lg"
			style="background-color: var(--color-expense)18;"
		>
			{once ? (isPaid ? '✅' : '🗓️') : (CATEGORY_ICONS[expense.category] ?? '📌')}
		</div>
		<div class="min-w-0 flex-1">
			<p class="truncate text-sm font-medium {isPaid ? 'line-through' : ''}">{expense.name}</p>
			<p class="text-xs text-neutral capitalize">
				{#if once}
					{#if expense.dueDate}
						due {new Date(expense.dueDate).toLocaleDateString('en-GB', {
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
	<div class="flex shrink-0 items-center gap-1 pr-4">
		<div class="text-right">
			<p class="text-sm font-semibold text-expense tabular-nums">
				{fmt(expense.amount)}
			</p>
			{#if showMonthly}
				<button
					type="button"
					onclick={() => (breakdownOpen = !breakdownOpen)}
					class="text-[10px] text-neutral tabular-nums transition-colors hover:text-expense"
				>
					{fmt(monthlyEquiv)}/mo
				</button>
			{/if}
		</div>
		<button type="button" onclick={() => onEdit?.(expense)}>
			<ChevronRight size={14} class="text-neutral" />
		</button>
	</div>
</div>

{#if breakdownOpen}
	<div class="mx-1 -mt-1 rounded-b-lg border border-t-0 border-border bg-surface-muted px-4 py-3">
		<p class="mb-2 text-[11px] font-semibold tracking-wider text-neutral uppercase">
			Monthly breakdown
		</p>
		<div class="flex items-center justify-between text-xs">
			<span class="text-neutral">{fmt(expense.amount)} {BREAKDOWN_LABEL[expense.recurrence]}</span>
			<span class="font-semibold text-expense tabular-nums">= {fmt(monthlyEquiv)}/mo</span>
		</div>
	</div>
{/if}
