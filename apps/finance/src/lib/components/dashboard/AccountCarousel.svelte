<script lang="ts">
	import { Plus } from 'lucide-svelte';
	import type { Account } from '$lib/types';
	import { getIntlLocale } from '$lib/utils';

	let {
		accounts,
		currency
	}: {
		accounts: Account[];
		currency: string;
	} = $props();

	function fmt(n: number) {
		return new Intl.NumberFormat(getIntlLocale(), {
			style: 'currency',
			currency,
			maximumFractionDigits: 0
		}).format(n);
	}

	const TYPE_TINTS: Record<string, { color: string; opacity: number }> = {
		checking: { color: '#16a34a', opacity: 0.08 },
		savings: { color: '#3b82f6', opacity: 0.08 },
		investment: { color: '#8b5cf6', opacity: 0.08 },
		cash: { color: '#f59e0b', opacity: 0.08 },
		crypto: { color: '#f59e0b', opacity: 0.05 },
		other: { color: '#71717a', opacity: 0.06 }
	};

	function getTint(type: string) {
		return TYPE_TINTS[type] ?? TYPE_TINTS['other'];
	}
</script>

<div
	class="flex gap-2.5 overflow-x-auto pb-1"
	style="scroll-snap-type: x mandatory; scrollbar-width: none; -ms-overflow-style: none;"
>
	{#each accounts as account (account.id)}
		{@const tint = getTint(account.type)}
		<div
			class="border-border-default relative flex shrink-0 flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] border"
			style="
				width: 168px;
				min-height: 108px;
				padding: 14px;
				scroll-snap-align: start;
				background: radial-gradient(ellipse at 80% 10%, {tint.color}{Math.round(tint.opacity * 255)
				.toString(16)
				.padStart(2, '0')} 0%, transparent 65%), var(--color-surface-1);
				{account.includeInTotal ? '' : 'opacity: 0.75;'}
			"
		>
			<!-- Top: emoji + type tag -->
			<div class="flex items-start justify-between">
				<span
					class="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-base"
					style="background: {tint.color}12;"
				>
					{account.emoji ?? '💼'}
				</span>
				<span class="mono text-text-faint text-[9px] tracking-[0.1em] uppercase">
					{account.type}
				</span>
			</div>

			<!-- Bottom: name + balance -->
			<div class="mt-auto pt-3">
				<p class="text-text-subtle truncate text-[12.5px]">{account.name}</p>
				<p class="text-text-primary mt-0.5 text-[18px] font-semibold tracking-tight">
					{fmt(account.balance)}
				</p>
			</div>
		</div>
	{/each}

	<!-- Add card -->
	<a
		href="/accounts?add=true"
		class="border-border-default bg-bg-1 flex shrink-0 flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed"
		style="width: 168px; min-height: 108px; scroll-snap-align: start;"
	>
		<div class="bg-bg-2 text-text-faint flex h-9 w-9 items-center justify-center rounded-full">
			<Plus size={18} stroke-width={1.5} />
		</div>
		<span class="text-text-faint mt-1.5 text-[11px]">Add</span>
	</a>
</div>

<style>
	div::-webkit-scrollbar {
		display: none;
	}
</style>
