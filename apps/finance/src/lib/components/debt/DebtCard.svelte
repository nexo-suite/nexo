<script lang="ts">
	import { ChevronRight, ArrowUpRight, ArrowDownLeft } from 'lucide-svelte';
	import { formatCurrency, getIntlLocale } from '$lib/utils';
	import type { Debt } from '$lib/types';

	let {
		debt,
		hideCents = false,
		onEdit
	}: { debt: Debt; hideCents?: boolean; onEdit?: (d: Debt) => void } = $props();

	const fmt = (n: number) => formatCurrency(n, 'EUR', hideCents);
</script>

<button
	type="button"
	onclick={() => onEdit?.(debt)}
	class="border-border-default bg-surface-1 hover:border-debt/30 flex w-full items-center gap-3
         rounded-lg border px-[14px] py-[11px] text-left shadow-sm
         transition-colors {debt.paid ? 'opacity-50' : ''}"
>
	<div
		class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
		style="background-color: color-mix(in oklab, var(--color-debt) 12%, transparent); color: var(--color-debt);"
	>
		{#if debt.direction === 'owe'}
			<ArrowUpRight size={16} stroke-width={2} />
		{:else}
			<ArrowDownLeft size={16} stroke-width={2} />
		{/if}
	</div>
	<div class="min-w-0 flex-1">
		<p class="truncate text-[14px] font-medium">{debt.counterparty}</p>
		<p class="text-text-subtle text-[11px]">
			{debt.direction === 'owe' ? 'I owe' : 'Owed to me'}
			{#if debt.dueDate}
				· due {new Date(debt.dueDate).toLocaleDateString(getIntlLocale(), {
					day: 'numeric',
					month: 'short'
				})}{/if}
			{#if debt.paid}
				· <span style="color: var(--color-income);">paid</span>{/if}
		</p>
	</div>
	<div class="flex items-center gap-1">
		<p class="text-[14px] font-semibold tabular-nums" style="color: var(--color-debt);">
			{fmt(debt.amount)}
		</p>
		<ChevronRight size={14} class="text-text-subtle" />
	</div>
</button>
