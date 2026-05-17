<script lang="ts">
	import type { UpcomingEvent } from '$lib/types';
	import { getIntlLocale } from '$lib/utils';

	let {
		events,
		currency,
		hideCents = false,
		limit = 5
	}: {
		events: UpcomingEvent[];
		currency: string;
		hideCents?: boolean;
		limit?: number;
	} = $props();

	function fmt(n: number) {
		return new Intl.NumberFormat(getIntlLocale(), {
			style: 'currency',
			currency,
			minimumFractionDigits: hideCents ? 0 : 2,
			maximumFractionDigits: hideCents ? 0 : 2
		}).format(n);
	}

	const TYPE_COLORS: Record<string, string> = {
		income: 'var(--color-income)',
		expense: 'var(--color-expense)',
		debt: 'var(--color-debt)'
	};

	const TYPE_INKS: Record<string, string> = {
		income: 'var(--income-ink)',
		expense: 'var(--expense-ink)',
		debt: 'var(--debt-ink)'
	};

	function fmtDate(d: string) {
		const date = new Date(d);
		const dow = date.toLocaleDateString(getIntlLocale(), { weekday: 'short' });
		const day = date.getDate();
		return `${dow} · ${day}`;
	}

	const visibleEvents = $derived(events.slice(0, limit));
</script>

{#if visibleEvents.length > 0}
	<div class="border-border-default bg-surface-1 overflow-hidden rounded-[var(--radius-xl)] border">
		{#each visibleEvents as event, i (event.id)}
			<div
				class="flex items-center gap-3 px-4 py-3
				{i < visibleEvents.length - 1 ? 'border-border-subtle border-b' : ''}"
			>
				<!-- Colored pip -->
				<span
					class="inline-block shrink-0 rounded-full"
					style="width: 7px; height: 7px; background: {TYPE_COLORS[event.type] ??
						'var(--color-text-faint)'};"
				></span>

				<!-- Date -->
				<span
					class="mono text-text-subtle shrink-0 text-[10.5px] tracking-wide uppercase"
					style="width: 56px;"
				>
					{fmtDate(event.date)}
				</span>

				<!-- Body -->
				<div class="min-w-0 flex-1">
					<p class="text-text-primary truncate text-[14px] font-medium">{event.label}</p>
					<p class="text-text-faint text-[11px]">
						recurring {event.type} · monthly
					</p>
				</div>

				<!-- Amount -->
				<span
					class="shrink-0 text-[14.5px] font-semibold tabular-nums"
					style="color: {TYPE_INKS[event.type] ?? 'var(--color-text-primary)'};"
				>
					{event.type === 'income' ? '+' : event.type === 'expense' ? '-' : ''}{fmt(event.amount)}
				</span>
			</div>
		{/each}
	</div>
{/if}
