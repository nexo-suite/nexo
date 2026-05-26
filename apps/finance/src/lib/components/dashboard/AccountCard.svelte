<script lang="ts">
	import { formatCurrency } from '$lib/utils';
	import { m } from '$lib/paraglide/messages.js';

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
		currency
	}: {
		account: {
			name: string;
			type: string;
			balance: number;
			includeInTotal: boolean;
			color: string | null;
		};
		currency: string;
	} = $props();

	const fmt = (n: number) => formatCurrency(n, currency);
</script>

<div
	class="border-border-default bg-surface-1 flex items-center gap-3.5 rounded-2xl border p-4
	       shadow-sm transition-shadow hover:shadow-md"
>
	<div
		class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
		style="background-color: {account.color ?? 'oklch(0.93 0.05 264)'}22;"
	>
		{TYPE_ICONS[account.type] ?? '💼'}
	</div>
	<div class="min-w-0 flex-1">
		<p class="truncate text-sm font-semibold">{account.name}</p>
		<p class="text-text-subtle text-xs capitalize">{account.type}</p>
	</div>
	<div class="text-right">
		<p class="text-sm font-semibold tabular-nums">{fmt(account.balance)}</p>
		{#if !account.includeInTotal}
			<p class="text-text-subtle text-[10px]">{m.account_excluded()}</p>
		{/if}
	</div>
</div>
