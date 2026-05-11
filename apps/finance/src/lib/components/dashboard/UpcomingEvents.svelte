<script lang="ts">
	import type { UpcomingEvent } from '$lib/types';
	import { ArrowDownLeft, ArrowUpRight, Users } from 'lucide-svelte';
	import { formatCurrency } from '$lib/utils';

	let { events }: { events: UpcomingEvent[] } = $props();

	const fmt = (n: number) => formatCurrency(n);

	const fmtDate = (d: string) =>
		new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

	const typeConfig = {
		income: { icon: ArrowDownLeft, color: 'var(--color-income)', sign: '+' },
		expense: { icon: ArrowUpRight, color: 'var(--color-expense)', sign: '-' },
		debt: { icon: Users, color: 'var(--color-debt)', sign: '' }
	};
</script>

{#if events.length > 0}
	<section>
		<p class="mb-2 text-xs font-semibold tracking-widest text-neutral uppercase">Upcoming</p>
		<div class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
			<ul>
				{#each events as event, i (event.date + event.label)}
					{@const cfg = typeConfig[event.type]}
					<li
						class="flex items-center gap-3.5 px-4 py-3.5
						       {i < events.length - 1 ? 'border-b border-border' : ''}"
					>
						<div
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
							style="background-color: color-mix(in oklab, {cfg.color} 10%, transparent); color: {cfg.color};"
						>
							<cfg.icon size={14} stroke-width={2} />
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium">{event.label}</p>
							<p class="text-xs text-neutral">{fmtDate(event.date)}</p>
						</div>
						<p class="text-sm font-semibold tabular-nums" style="color: {cfg.color};">
							{cfg.sign}{fmt(event.amount)}
						</p>
					</li>
				{/each}
			</ul>
		</div>
	</section>
{:else}
	<section>
		<p class="mb-2 text-xs font-semibold tracking-widest text-neutral uppercase">Upcoming</p>
		<div class="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5 shadow-sm">
			<p class="text-sm text-neutral">Nothing due in the next 30 days.</p>
		</div>
	</section>
{/if}
