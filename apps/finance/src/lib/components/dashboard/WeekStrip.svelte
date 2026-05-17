<script lang="ts">
	import type { UpcomingEvent } from '$lib/types';
	import { SvelteDate } from 'svelte/reactivity';

	let {
		events,
		weekStartDay = 'monday'
	}: {
		events: UpcomingEvent[];
		weekStartDay?: string;
	} = $props();

	const DOW_LABELS_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const DOW_LABELS_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	const TYPE_COLORS: Record<string, string> = {
		income: 'var(--color-income)',
		expense: 'var(--color-expense)',
		debt: 'var(--color-debt)'
	};

	const now = new SvelteDate();

	const weekDays = $derived.by(() => {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const today = new Date(now);
		today.setHours(0, 0, 0, 0);
		const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...

		const startOffset =
			weekStartDay === 'sunday' ? -dayOfWeek : dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const start = new Date(today);
		start.setDate(today.getDate() + startOffset);

		const labels = weekStartDay === 'sunday' ? DOW_LABELS_SUN : DOW_LABELS_MON;

		return Array.from({ length: 7 }, (_, i) => {
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			const date = new Date(start);
			date.setDate(start.getDate() + i);
			const dateStr = date.toISOString().split('T')[0];
			const isPast = date < today;
			const isToday = dateStr === today.toISOString().split('T')[0];
			const dayEvents = events.filter((e) => e.date === dateStr);

			return {
				dow: labels[i],
				day: date.getDate(),
				dateStr,
				isPast: isPast && !isToday,
				isToday,
				events: dayEvents
			};
		});
	});
</script>

<div class="grid grid-cols-7 gap-1.5">
	{#each weekDays as cell (cell.dateStr)}
		<div
			class="relative flex aspect-square flex-col items-center justify-center rounded-[var(--radius-md)] border
			{cell.isToday ? 'bg-text-primary border-transparent' : 'bg-surface-1 border-border-subtle'}
			{cell.isPast ? 'opacity-45' : ''}"
			style="padding: 4px 2px;"
		>
			<!-- DOW label -->
			<span
				class="mono text-[9px] tracking-[0.08em] uppercase
				{cell.isToday ? 'text-white/60' : 'text-text-faint'}"
			>
				{cell.dow}
			</span>

			<!-- Day number -->
			<span
				class="text-[15px] leading-tight font-semibold
				{cell.isToday ? 'text-white' : 'text-text-primary'}"
			>
				{cell.day}
			</span>

			<!-- Event pips -->
			{#if cell.events.length > 0}
				<div class="mt-0.5 flex items-center gap-0.5">
					{#each cell.events.slice(0, 3) as ev (ev.label + ev.type)}
						<span
							class="inline-block h-1 w-1 rounded-full"
							style="background: {TYPE_COLORS[ev.type] ?? 'var(--color-text-faint)'};"
						></span>
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>
