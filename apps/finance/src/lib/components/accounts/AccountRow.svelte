<script lang="ts">
	import { ChevronRight } from '@lucide/svelte';
	import { formatCurrency } from '$lib/utils';
	import { m } from '$lib/paraglide/messages.js';
	import type { Account } from '$lib/types';

	const TYPE_ICONS: Record<string, string> = {
		checking: '🏦',
		savings: '🏛️',
		crypto: '₿',
		investment: '📈',
		cash: '💵',
		other: '💼'
	};

	let {
		account,
		currency,
		onEdit
	}: { account: Account; currency: string; onEdit?: (a: Account) => void } = $props();

	const fmt = (n: number) => formatCurrency(n, currency);
</script>

<button
	type="button"
	onclick={() => onEdit?.(account)}
	class="flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)]
         bg-[var(--color-surface)] p-4 text-left shadow-sm transition-colors hover:border-[var(--color-primary-200)]"
>
	<div
		class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-lg"
		style="background-color: {account.color ?? 'oklch(0.93 0.05 264)'}22;"
	>
		{TYPE_ICONS[account.type] ?? '💼'}
	</div>
	<div class="min-w-0 flex-1">
		<p class="truncate text-sm font-medium">{account.name}</p>
		<p class="text-xs text-[var(--color-neutral)] capitalize">
			{account.type}
			{#if !account.includeInTotal}
				· <span class="text-[var(--color-debt)]">{m.account_excluded_from_total()}</span>
			{/if}
		</p>
	</div>
	<div class="flex items-center gap-1">
		<p class="text-sm font-semibold tabular-nums">{fmt(account.balance)}</p>
		<ChevronRight size={14} class="text-[var(--color-neutral)]" />
	</div>
</button>
