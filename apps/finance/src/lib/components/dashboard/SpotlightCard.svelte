<script lang="ts">
	import type { UpcomingEvent } from '$lib/types';
	import { getIntlLocale } from '$lib/utils';

	let {
		event,
		currency,
		hideCents = false,
		context
	}: {
		event: UpcomingEvent | null;
		currency: string;
		hideCents?: boolean;
		context?: string;
	} = $props();

	function fmt(n: number) {
		return new Intl.NumberFormat(getIntlLocale(), {
			style: 'currency',
			currency,
			minimumFractionDigits: hideCents ? 0 : 2,
			maximumFractionDigits: hideCents ? 0 : 2
		}).format(n);
	}

	const TYPE_STYLES: Record<string, { ink: string; soft: string; label: string }> = {
		expense: { ink: 'var(--expense-ink)', soft: 'var(--expense-soft)', label: 'Expense' },
		income: { ink: 'var(--income-ink)', soft: 'var(--income-soft)', label: 'Income' },
		debt: { ink: 'var(--debt-ink)', soft: 'var(--debt-soft)', label: 'Debt' }
	};

	const style = $derived(
		event ? (TYPE_STYLES[event.type] ?? TYPE_STYLES['expense']) : TYPE_STYLES['expense']
	);
</script>

{#if event}
	<div
		class="border-border-default bg-surface-1 relative overflow-hidden rounded-[var(--radius-lg)] border"
		style="padding: 14px 16px;"
	>
		<!-- Left gradient tint -->
		<div
			class="pointer-events-none absolute inset-y-0 left-0 w-24"
			style="background: linear-gradient(90deg, {style.soft} 0%, transparent 100%);"
		></div>

		<!-- Tag -->
		<div class="relative">
			<span
				class="mono text-[9.5px] font-medium tracking-[0.1em] uppercase"
				style="color: {style.ink};"
			>
				Hits today · {style.label}
			</span>
		</div>

		<!-- Name + amount row -->
		<div class="relative mt-1.5 flex items-center justify-between gap-3">
			<p class="text-text-primary min-w-0 truncate text-[16px] font-semibold">
				{event.label}
			</p>
			<p class="shrink-0 text-[16px] font-semibold tabular-nums" style="color: {style.ink};">
				{event.type === 'income' ? '+' : event.type === 'expense' ? '-' : ''}{fmt(event.amount)}
			</p>
		</div>

		<!-- Context subtitle -->
		{#if context}
			<p class="text-text-muted relative mt-1 text-[12.5px]">
				{context}
			</p>
		{/if}
	</div>
{/if}
