<script lang="ts">
	import { ChevronRight, ArrowUpRight, ArrowDownLeft } from 'lucide-svelte';
	import { formatCurrency } from '$lib/utils';
	import type { Debt } from '$lib/types';

	let { debt, onEdit }: { debt: Debt; onEdit?: (d: Debt) => void } = $props();

	const fmt = (n: number) => formatCurrency(n);
</script>

<button
	type="button"
	onclick={() => onEdit?.(debt)}
	class="flex w-full items-center gap-3 rounded-lg border border-border
         bg-surface p-4 text-left shadow-sm transition-colors
         hover:border-debt/30 {debt.paid ? 'opacity-50' : ''}"
>
	<div
		class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
		style="background-color: color-mix(in oklab, var(--color-debt) 12%, transparent); color: var(--color-debt);"
	>
		{#if debt.direction === 'owe'}
			<ArrowUpRight size={18} stroke-width={2} />
		{:else}
			<ArrowDownLeft size={18} stroke-width={2} />
		{/if}
	</div>
	<div class="min-w-0 flex-1">
		<p class="truncate text-sm font-medium">{debt.counterparty}</p>
		<p class="text-xs text-neutral">
			{debt.direction === 'owe' ? 'I owe' : 'Owed to me'}
			{#if debt.dueDate}
				· due {new Date(debt.dueDate).toLocaleDateString('en-GB', {
					day: 'numeric',
					month: 'short'
				})}{/if}
			{#if debt.paid}
				· <span style="color: var(--color-income);">paid</span>{/if}
		</p>
	</div>
	<div class="flex items-center gap-1">
		<p class="text-sm font-semibold tabular-nums" style="color: var(--color-debt);">
			{fmt(debt.amount)}
		</p>
		<ChevronRight size={14} class="text-neutral" />
	</div>
</button>
