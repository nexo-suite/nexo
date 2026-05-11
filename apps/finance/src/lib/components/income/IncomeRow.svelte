<script lang="ts">
	import { ChevronRight, CheckCircle } from 'lucide-svelte';
	import { formatCurrency } from '$lib/utils';
	import type { Income } from '$lib/types';

	let {
		income,
		once = false,
		onEdit
	}: { income: Income; once?: boolean; onEdit?: (i: Income) => void } = $props();

	const fmt = (n: number) => formatCurrency(n);
</script>

<button
	type="button"
	onclick={() => onEdit?.(income)}
	class="flex w-full items-center gap-3 rounded-lg border bg-surface p-4 text-left shadow-sm transition-colors
	       {once
		? 'border-dashed border-border hover:border-income/40'
		: 'border-border hover:border-income/30'}
	       {once && income.received ? 'opacity-60' : ''}"
>
	<div
		class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-lg"
		style="background-color: color-mix(in oklab, var(--color-income) 10%, transparent);"
	>
		{income.received ? '✅' : '⏳'}
	</div>
	<div class="min-w-0 flex-1">
		<p class="truncate text-sm font-medium {once && income.received ? 'line-through' : ''}">
			{income.name}
		</p>
		<p class="text-xs text-neutral capitalize">
			{#if once}
				{#if income.expectedDate}
					due {new Date(income.expectedDate).toLocaleDateString('en-GB', {
						day: 'numeric',
						month: 'short'
					})}
				{:else}
					one-time
				{/if}
				{#if income.received}<span class="text-income"> · received</span>{/if}
			{:else}
				{income.recurrence}
				{#if income.expectedDate}
					· due {new Date(income.expectedDate).toLocaleDateString('en-GB', {
						day: 'numeric',
						month: 'short'
					})}{/if}
			{/if}
		</p>
	</div>
	<div class="flex items-center gap-1">
		{#if income.received}
			<CheckCircle size={14} style="color: var(--color-income);" />
		{/if}
		<p class="text-sm font-semibold text-income tabular-nums">
			{fmt(income.amount)}
		</p>
		<ChevronRight size={14} class="text-neutral" />
	</div>
</button>
