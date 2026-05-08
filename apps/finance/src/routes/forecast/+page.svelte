<script lang="ts">
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import { resolveMonthlyDate, toDateStr } from '$lib/dateUtils';

	import { SvelteDate } from 'svelte/reactivity';

	let { data } = $props();

	const fmt = (n: number) =>
		new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

	const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

	const today = new SvelteDate();
	const DAYS = 90;

	interface ForecastPoint {
		date: Date;
		balance: number;
		events: { label: string; amount: number; type: 'income' | 'expense' | 'debt' }[];
	}

	const currentBalance = $derived(
		data.accounts
			.filter((a: { includeInTotal: boolean }) => a.includeInTotal)
			.reduce((s: number, a: { balance: number }) => s + a.balance, 0)
	);

	function firesOnDay(
		recurrence: string,
		dayOfMonth: string | null,
		dueDate: string | null,
		d: Date,
		dayStr: string,
		todayMs: number
	): boolean {
		switch (recurrence) {
			case 'once':
				return (dueDate ?? null) === dayStr;
			case 'monthly':
				if (!dayOfMonth) return false;
				return toDateStr(resolveMonthlyDate(d.getFullYear(), d.getMonth(), dayOfMonth)) === dayStr;
			case 'weekly':
				return (d.getTime() - todayMs) % (7 * 86400000) === 0;
			case 'biweekly':
				return (d.getTime() - todayMs) % (14 * 86400000) === 0;
			case 'quarterly': {
				if (!dayOfMonth) return false;
				// fires in the same month-offset every 3 months relative to today
				const monthDiff =
					(d.getFullYear() - new Date(todayMs).getFullYear()) * 12 +
					d.getMonth() -
					new Date(todayMs).getMonth();
				if (monthDiff % 3 !== 0) return false;
				return toDateStr(resolveMonthlyDate(d.getFullYear(), d.getMonth(), dayOfMonth)) === dayStr;
			}
			case 'yearly': {
				if (!dayOfMonth) return false;
				const origin = new Date(todayMs);
				if (d.getMonth() !== origin.getMonth()) return false;
				return toDateStr(resolveMonthlyDate(d.getFullYear(), d.getMonth(), dayOfMonth)) === dayStr;
			}
			default:
				return false;
		}
	}

	const forecast = $derived(() => {
		const points: ForecastPoint[] = [];
		let running = currentBalance;
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const todayMidnight = new Date(today);
		todayMidnight.setHours(0, 0, 0, 0);
		const todayMs = todayMidnight.getTime();

		for (let i = 0; i <= DAYS; i++) {
			const d = new Date(todayMs + i * 86400000);
			const dayStr = toDateStr(d);
			const events: ForecastPoint['events'] = [];

			for (const e of data.expenses) {
				if (e.active && firesOnDay(e.recurrence, e.dayOfMonth, e.dueDate, d, dayStr, todayMs)) {
					events.push({ label: e.name, amount: Number(e.amount), type: 'expense' });
					running -= Number(e.amount);
				}
			}
			for (const inc of data.incomeItems) {
				if (firesOnDay(inc.recurrence, inc.dayOfMonth, inc.expectedDate, d, dayStr, todayMs)) {
					events.push({ label: inc.name, amount: Number(inc.amount), type: 'income' });
					running += Number(inc.amount);
				}
			}
			for (const debt of data.debts) {
				if (!debt.paid && debt.dueDate === dayStr) {
					const sign = debt.direction === 'owe' ? -1 : 1;
					events.push({ label: debt.counterparty, amount: Number(debt.amount), type: 'debt' });
					running += sign * Number(debt.amount);
				}
			}

			if (events.length > 0 || i === 0 || i === DAYS) {
				points.push({ date: d, balance: running, events });
			}
		}
		return points;
	});

	const minBalance = $derived(Math.min(...forecast().map((p) => p.balance)));
	const endBalance = $derived(forecast()[forecast().length - 1]?.balance ?? currentBalance);
</script>

<div class="pb-6">
	<div class="px-4 pt-4">
		<PageHeader
			title="Forecast"
			subtitle="90-day cashflow"
			user={data.user}
			displayName={data.settings.displayName}
		/>
	</div>

	<div class="mx-4 mb-4 grid grid-cols-2 gap-3">
		<div class="rounded-lg border border-border bg-surface px-4 py-3">
			<p class="text-xs text-neutral">Today</p>
			<p
				class="mt-0.5 text-sm font-semibold tabular-nums {currentBalance >= 0
					? 'text-income'
					: 'text-expense'}"
			>
				{fmt(currentBalance)}
			</p>
		</div>
		<div class="rounded-lg border border-border bg-surface px-4 py-3">
			<p class="text-xs text-neutral">In 90 days</p>

			<p
				class="mt-0.5 text-sm font-semibold tabular-nums {endBalance >= 0
					? 'text-income'
					: 'text-expense'}"
			>
				{fmt(endBalance)}
			</p>
		</div>
	</div>

	{#if minBalance < 0}
		<div class="mx-4 mb-4 rounded-lg border border-expense/30 bg-expense/5 px-4 py-3">
			<p class="text-xs font-medium text-expense">
				⚠️ Balance dips below zero. Lowest: {fmt(minBalance)}
			</p>
		</div>
	{/if}

	<div class="space-y-1 px-4">
		{#each forecast() as point (point.date.toISOString())}
			{#if point.events.length > 0}
				<div class="rounded-lg border border-border bg-surface p-3">
					<div class="mb-2 flex items-center justify-between">
						<p class="text-xs font-semibold text-neutral">{fmtDate(point.date)}</p>
						<p
							class="text-xs font-semibold tabular-nums {point.balance >= 0
								? 'text-income'
								: 'text-expense'}"
						>
							{fmt(point.balance)}
						</p>
					</div>
					<ul class="space-y-1">
						{#each point.events as ev (ev.label + ev.type)}
							<li class="flex items-center justify-between text-xs">
								<span>{ev.label}</span>
								<span
									class="tabular-nums"
									style="color: {ev.type === 'income'
										? 'var(--color-income)'
										: ev.type === 'expense'
											? 'var(--color-expense)'
											: 'var(--color-debt)'};"
								>
									{ev.type === 'income' ? '+' : '-'}{fmt(ev.amount)}
								</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		{/each}

		{#if forecast().filter((p) => p.events.length > 0).length === 0}
			<div class="rounded-xl border border-dashed border-border p-8 text-center">
				<p class="text-sm text-neutral">No upcoming cashflow events in the next 90 days.</p>
				<p class="mt-1 text-xs text-neutral">
					Add expenses, income, or debts with due dates to see your forecast.
				</p>
			</div>
		{/if}
	</div>
</div>
