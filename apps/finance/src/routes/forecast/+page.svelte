<script lang="ts">
	import { resolveMonthlyDate, toDateStr } from '$lib/dateUtils';
	import { formatCurrency, getIntlLocale } from '$lib/utils';
	import FlowPip from '$lib/components/ui/FlowPip.svelte';
	import { PageHeader } from '@nexo/ui';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import { TrendingUp, TrendingDown, AlertTriangle } from '@lucide/svelte';

	import { SvelteDate } from 'svelte/reactivity';

	let { data } = $props();

	const fmt = (n: number) => formatCurrency(n, data.settings.currency, data.settings.hideCents);
	const fmtDate = (d: Date) =>
		d.toLocaleDateString(getIntlLocale(), { day: 'numeric', month: 'short' });
	const fmtShort = (d: Date) =>
		d.toLocaleDateString(getIntlLocale(), { day: 'numeric', month: 'short', year: '2-digit' });

	const today = new SvelteDate();
	const DAYS = $derived(Number(data.settings?.forecastDays) || 90);

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

	const forecast = $derived.by(() => {
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
			if (data.settings?.includeDebtInForecast !== false) {
				for (const debt of data.debts) {
					if (!debt.paid && debt.dueDate === dayStr) {
						const sign = debt.direction === 'owe' ? -1 : 1;
						events.push({ label: debt.counterparty, amount: Number(debt.amount), type: 'debt' });
						running += sign * Number(debt.amount);
					}
				}
			}

			points.push({ date: d, balance: running, events });
		}
		return points;
	});

	const minBalance = $derived(Math.min(...forecast.map((p) => p.balance)));
	const maxBalance = $derived(Math.max(...forecast.map((p) => p.balance)));
	const endBalance = $derived(forecast[forecast.length - 1]?.balance ?? currentBalance);
	const lowestPoint = $derived(
		forecast.reduce((low, p) => (p.balance < low.balance ? p : low), forecast[0])
	);
	const firstNegativeDate = $derived(forecast.find((p) => p.balance < 0)?.date ?? null);
	const delta = $derived(endBalance - currentBalance);

	const eventsOnly = $derived(forecast.filter((p) => p.events.length > 0));

	// Week summary carousel
	const weekSummaries = $derived.by(() => {
		const weeks: {
			start: Date;
			end: Date;
			endBalance: number;
			income: number;
			expense: number;
			isCurrent: boolean;
		}[] = [];
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const todayMidnight = new Date(today);
		todayMidnight.setHours(0, 0, 0, 0);
		const todayMs = todayMidnight.getTime();
		const dayOfWeek = todayMidnight.getDay() || 7;
		const weekStart = new Date(todayMs - (dayOfWeek - 1) * 86400000);

		for (let w = 0; w < 13; w++) {
			const start = new Date(weekStart.getTime() + w * 7 * 86400000);
			const end = new Date(start.getTime() + 6 * 86400000);
			let income = 0;
			let expense = 0;
			let endBal = currentBalance;

			for (const p of forecast) {
				if (p.date <= end) {
					endBal = p.balance;
					if (p.date >= start) {
						for (const ev of p.events) {
							if (ev.type === 'income') income += ev.amount;
							else expense += ev.amount;
						}
					}
				}
			}

			weeks.push({ start, end, endBalance: endBal, income, expense, isCurrent: w === 0 });
		}
		return weeks;
	});

	// SVG sparkline
	const sparklinePath = $derived.by(() => {
		if (forecast.length < 2) return '';
		const w = 320;
		const h = 60;
		const pad = 4;
		const range = maxBalance - minBalance || 1;
		const points = forecast.map((p, i) => {
			const x = pad + (i / (forecast.length - 1)) * (w - pad * 2);
			const y = pad + (1 - (p.balance - minBalance) / range) * (h - pad * 2);
			return `${x},${y}`;
		});
		return `M${points.join(' L')}`;
	});

	const sparklineAreaPath = $derived.by(() => {
		if (forecast.length < 2) return '';
		const w = 320;
		const h = 60;
		const pad = 4;
		const range = maxBalance - minBalance || 1;
		const points = forecast.map((p, i) => {
			const x = pad + (i / (forecast.length - 1)) * (w - pad * 2);
			const y = pad + (1 - (p.balance - minBalance) / range) * (h - pad * 2);
			return `${x},${y}`;
		});
		return `M${points[0]} L${points.join(' L')} L${320 - pad},${h - pad} L${pad},${h - pad} Z`;
	});
</script>

<div class="page">
	<PageHeader title="Forecast" subtitle="90-day cashflow trajectory.">
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
	</PageHeader>

	<!-- Top pair -->
	<div class="mb-3.5 grid grid-cols-2 gap-2.5">
		<div
			class="rounded-[var(--radius-lg)] p-3.5"
			style="background: var(--accent-soft); border: 1px solid var(--accent-line);"
		>
			<div class="t-label" style="color: var(--accent-ink);">Today</div>
			<div
				class="mt-1.5 font-mono text-[22px] font-semibold tracking-tight"
				style="color: var(--accent-ink); font-variant-numeric: tabular-nums;"
			>
				{fmt(currentBalance)}
			</div>
		</div>
		<div class="border-border-default bg-surface-1 rounded-[var(--radius-lg)] border p-3.5">
			<div class="t-label text-text-subtle">In 90 days</div>
			<div
				class="mt-1.5 font-mono text-[22px] font-semibold tracking-tight"
				style="font-variant-numeric: tabular-nums;"
			>
				{fmt(endBalance)}
			</div>
			{#if delta !== 0}
				<div
					class="mt-1 flex items-center gap-1 text-[11px]"
					style="color: {delta >= 0 ? 'var(--income-ink)' : 'var(--expense-ink)'};"
				>
					{#if delta >= 0}
						<TrendingUp size={11} />
					{:else}
						<TrendingDown size={11} />
					{/if}
					<span class="font-mono" style="font-variant-numeric: tabular-nums;"
						>{delta >= 0 ? '+' : ''}{fmt(delta)}</span
					>
				</div>
			{/if}
		</div>
	</div>

	<!-- Warning banner -->
	{#if minBalance < 0}
		<div
			class="mb-3.5 flex items-center gap-2.5 rounded-[var(--radius-lg)] px-3.5 py-3"
			style="background: var(--expense-soft); border: 1px solid color-mix(in oklab, var(--color-expense) 25%, var(--color-border-default));"
		>
			<AlertTriangle size={15} style="color: var(--expense-ink);" />
			<p class="text-[12px] font-medium" style="color: var(--expense-ink);">
				Balance goes negative{firstNegativeDate ? ` on ${fmtDate(firstNegativeDate)}` : ''}. Lowest: {fmt(
					minBalance
				)}
			</p>
		</div>
	{/if}

	<!-- Sparkline chart card -->
	{#if forecast.length > 1}
		<div
			class="border-border-default bg-surface-1 mb-3.5 overflow-hidden rounded-[var(--radius-xl)] border p-4"
		>
			<div class="mb-3 flex items-center justify-between">
				<div class="t-label text-text-subtle">Trajectory</div>
				<div class="text-text-faint text-[11px]">
					{fmtShort(forecast[0].date)} → {fmtShort(forecast[forecast.length - 1].date)}
				</div>
			</div>
			<svg viewBox="0 0 320 60" class="w-full" preserveAspectRatio="none" style="height: 60px;">
				<path d={sparklineAreaPath} fill="var(--accent-soft)" />
				<path
					d={sparklinePath}
					fill="none"
					stroke="var(--color-accent)"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			<div class="mt-3 grid grid-cols-3 gap-2">
				<div>
					<div class="t-label text-text-faint">Today</div>
					<div
						class="mt-0.5 font-mono text-[13px] font-semibold"
						style="font-variant-numeric: tabular-nums;"
					>
						{fmt(currentBalance)}
					</div>
				</div>
				<div>
					<div class="t-label text-text-faint">Lowest</div>
					<div
						class="mt-0.5 font-mono text-[13px] font-semibold"
						style="color: {minBalance < 0
							? 'var(--expense-ink)'
							: 'var(--color-text-primary)'}; font-variant-numeric: tabular-nums;"
					>
						{fmt(minBalance)}
					</div>
					{#if lowestPoint}
						<div class="text-text-faint text-[10px]">{fmtDate(lowestPoint.date)}</div>
					{/if}
				</div>
				<div>
					<div class="t-label text-text-faint">End</div>
					<div
						class="mt-0.5 font-mono text-[13px] font-semibold"
						style="color: {endBalance >= currentBalance
							? 'var(--income-ink)'
							: 'var(--expense-ink)'}; font-variant-numeric: tabular-nums;"
					>
						{fmt(endBalance)}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Week summary carousel -->
	{#if weekSummaries.length > 0}
		<div class="mb-3.5">
			<div class="t-label text-text-subtle mb-2 px-0.5">Weekly outlook</div>
			<div
				class="flex gap-2.5 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
				style="scroll-snap-type: x mandatory;"
			>
				{#each weekSummaries as week, i (i)}
					<div
						class="shrink-0 rounded-[var(--radius-lg)] border p-3"
						style="width: 140px; scroll-snap-align: start; {week.isCurrent
							? 'border-color: var(--color-accent); background: var(--accent-soft);'
							: week.endBalance < 0
								? 'border-color: color-mix(in oklab, var(--color-expense) 25%, var(--color-border-default)); background: var(--expense-soft);'
								: 'border-color: var(--color-border-default); background: var(--color-surface-1);'}"
					>
						<div class="text-text-subtle text-[10px] font-medium">
							{fmtDate(week.start)} – {fmtDate(week.end)}
						</div>
						<div
							class="mt-1.5 font-mono text-[14px] font-semibold"
							style="font-variant-numeric: tabular-nums; color: {week.endBalance < 0
								? 'var(--expense-ink)'
								: 'var(--color-text-primary)'};"
						>
							{fmt(week.endBalance)}
						</div>
						{#if week.income > 0 || week.expense > 0}
							<div class="mt-1.5 flex items-center gap-2 text-[10px]">
								{#if week.income > 0}
									<span style="color: var(--income-ink);">+{fmt(week.income)}</span>
								{/if}
								{#if week.expense > 0}
									<span style="color: var(--expense-ink);">-{fmt(week.expense)}</span>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Day-by-day event cards -->
	<div class="t-label text-text-subtle mb-2 px-0.5">Events</div>

	{#if eventsOnly.length > 0}
		<div
			class="border-border-default bg-surface-1 overflow-hidden rounded-[var(--radius-xl)] border"
		>
			{#each eventsOnly as point, idx (point.date.toISOString())}
				<div class="px-3.5 py-2.5" class:border-t={idx > 0} class:border-border-subtle={idx > 0}>
					<div class="mb-1.5 flex items-center justify-between">
						<span class="text-text-subtle font-mono text-[11px] font-medium"
							>{fmtDate(point.date)}</span
						>
						<span
							class="font-mono text-[12px] font-semibold"
							style="font-variant-numeric: tabular-nums; color: {point.balance >= 0
								? 'var(--color-text-primary)'
								: 'var(--expense-ink)'};"
						>
							{fmt(point.balance)}
						</span>
					</div>
					{#each point.events as ev (ev.label + ev.type)}
						<div class="flex items-center justify-between py-0.5">
							<div class="flex items-center gap-1.5">
								<FlowPip type={ev.type} />
								<span class="text-text-muted text-[13px]">{ev.label}</span>
							</div>
							<span
								class="font-mono text-[12px]"
								style="font-variant-numeric: tabular-nums; color: {ev.type === 'income'
									? 'var(--income-ink)'
									: ev.type === 'expense'
										? 'var(--expense-ink)'
										: 'var(--debt-ink)'};"
							>
								{ev.type === 'income' ? '+' : '-'}{fmt(ev.amount)}
							</span>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	{:else}
		<div
			class="border-border-default bg-surface-1 rounded-[var(--radius-xl)] border border-dashed p-7 text-center"
		>
			<p class="text-text-subtle text-[13.5px]">No upcoming cashflow events in the next 90 days.</p>
			<p class="text-text-faint mt-1 text-[11px]">
				Add expenses, income, or debts with due dates to see your forecast.
			</p>
		</div>
	{/if}
</div>
