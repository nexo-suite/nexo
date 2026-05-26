<script lang="ts">
	import { resolveMonthlyDate, toDateStr } from '$lib/dateUtils';
	import { formatCurrency, getIntlLocale } from '$lib/utils';
	import FlowPip from '$lib/components/ui/FlowPip.svelte';
	import MoodPill from '$lib/components/ui/MoodPill.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ScenarioChips, {
		type Scenario
	} from '$lib/components/forecast/ScenarioChips.svelte';
	import { PageHeader } from '@nexo/ui';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import { TrendingUp, TrendingDown, AlertTriangle } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	import { SvelteDate } from 'svelte/reactivity';

	let { data } = $props();

	const fmt = (n: number) => formatCurrency(n, data.settings.currency, data.settings.hideCents);
	const fmtDate = (d: Date) =>
		d.toLocaleDateString(getIntlLocale(), { day: 'numeric', month: 'short' });
	const fmtShort = (d: Date) =>
		d.toLocaleDateString(getIntlLocale(), { day: 'numeric', month: 'short', year: '2-digit' });

	const today = new SvelteDate();
	const DAYS = $derived(Number(data.settings?.forecastDays) || 90);

	let scenarios = $state<Scenario[]>([]);

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

	// Helper: should an expense be skipped under "pause-subs" scenario?
	function isSubscription(category: string | null | undefined): boolean {
		return category === 'subscription' || category === 'entertainment';
	}

	const forecast = $derived.by(() => {
		const points: ForecastPoint[] = [];
		let running = currentBalance;
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const todayMidnight = new Date(today);
		todayMidnight.setHours(0, 0, 0, 0);
		const todayMs = todayMidnight.getTime();

		const skipSubs = scenarios.includes('pause-subs');
		const incomeMul = scenarios.includes('income-up') ? 1.05 : 1;
		const skipDebt = scenarios.includes('drop-debt');

		for (let i = 0; i <= DAYS; i++) {
			const d = new Date(todayMs + i * 86400000);
			const dayStr = toDateStr(d);
			const events: ForecastPoint['events'] = [];

			for (const e of data.expenses) {
				if (skipSubs && isSubscription(e.category)) continue;
				if (e.active && firesOnDay(e.recurrence, e.dayOfMonth, e.dueDate, d, dayStr, todayMs)) {
					events.push({ label: e.name, amount: Number(e.amount), type: 'expense' });
					running -= Number(e.amount);
				}
			}
			for (const inc of data.incomeItems) {
				if (firesOnDay(inc.recurrence, inc.dayOfMonth, inc.expectedDate, d, dayStr, todayMs)) {
					const amt = Number(inc.amount) * incomeMul;
					events.push({ label: inc.name, amount: amt, type: 'income' });
					running += amt;
				}
			}
			if (data.settings?.includeDebtInForecast !== false && !skipDebt) {
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

	// Bigger hero sparkline + zero baseline
	const HERO_W = 320;
	const HERO_H = 140;
	const HERO_PAD = 8;

	const heroPath = $derived.by(() => {
		if (forecast.length < 2) return '';
		const range = maxBalance - minBalance || 1;
		const points = forecast.map((p, i) => {
			const x = HERO_PAD + (i / (forecast.length - 1)) * (HERO_W - HERO_PAD * 2);
			const y = HERO_PAD + (1 - (p.balance - minBalance) / range) * (HERO_H - HERO_PAD * 2);
			return `${x},${y}`;
		});
		return `M${points.join(' L')}`;
	});

	const heroAreaPath = $derived.by(() => {
		if (forecast.length < 2) return '';
		const range = maxBalance - minBalance || 1;
		const points = forecast.map((p, i) => {
			const x = HERO_PAD + (i / (forecast.length - 1)) * (HERO_W - HERO_PAD * 2);
			const y = HERO_PAD + (1 - (p.balance - minBalance) / range) * (HERO_H - HERO_PAD * 2);
			return `${x},${y}`;
		});
		return `M${points[0]} L${points.join(' L')} L${HERO_W - HERO_PAD},${HERO_H - HERO_PAD} L${HERO_PAD},${HERO_H - HERO_PAD} Z`;
	});

	const zeroLineY = $derived.by(() => {
		const range = maxBalance - minBalance || 1;
		if (minBalance >= 0 || maxBalance <= 0) return null;
		return HERO_PAD + (1 - (0 - minBalance) / range) * (HERO_H - HERO_PAD * 2);
	});

	const lowMarker = $derived.by(() => {
		if (forecast.length < 2 || !lowestPoint) return null;
		const range = maxBalance - minBalance || 1;
		const idx = forecast.indexOf(lowestPoint);
		const x = HERO_PAD + (idx / (forecast.length - 1)) * (HERO_W - HERO_PAD * 2);
		const y =
			HERO_PAD + (1 - (lowestPoint.balance - minBalance) / range) * (HERO_H - HERO_PAD * 2);
		return { x, y };
	});

	const endMarker = $derived.by(() => {
		if (forecast.length < 2) return null;
		const range = maxBalance - minBalance || 1;
		const last = forecast[forecast.length - 1];
		const x = HERO_W - HERO_PAD;
		const y = HERO_PAD + (1 - (last.balance - minBalance) / range) * (HERO_H - HERO_PAD * 2);
		return { x, y };
	});
</script>

<div class="page">
	<PageHeader title={m.nav_forecast()} subtitle={m.forecast_subtitle()}>
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
	</PageHeader>

	<!-- Mood + delta hero strip -->
	<div class="mb-3 flex items-center gap-2">
		<MoodPill
			liquidBalance={currentBalance}
			lowestValue={minBalance}
			lowestDate={lowestPoint ? toDateStr(lowestPoint.date) : undefined}
			endValue={endBalance}
		/>
		{#if delta !== 0}
			<span
				class="mono ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums"
				style="background: {delta >= 0 ? 'var(--income-soft)' : 'var(--expense-soft)'};
				       color: {delta >= 0 ? 'var(--income-ink)' : 'var(--expense-ink)'};"
			>
				{#if delta >= 0}
					<TrendingUp size={11} strokeWidth={2.5} />
				{:else}
					<TrendingDown size={11} strokeWidth={2.5} />
				{/if}
				{delta >= 0 ? '+' : ''}{fmt(delta)}
			</span>
		{/if}
	</div>

	<!-- Big hero chart card -->
	{#if forecast.length > 1}
		<div
			class="border-border-default bg-surface-1 relative mb-3.5 overflow-hidden rounded-[var(--radius-2xl)] border"
			style="padding: 16px 16px 14px;"
		>
			<div
				class="pointer-events-none absolute inset-0"
				style="background: radial-gradient(circle at 0% 0%, var(--accent-glow) 0%, transparent 55%); opacity: 0.7;"
			></div>

			<div class="relative flex items-center justify-between">
				<div class="t-label text-text-subtle">{m.forecast_trajectory()}</div>
				<div class="text-text-faint mono text-[10px] tabular-nums">
					{fmtShort(forecast[0].date)} → {fmtShort(forecast[forecast.length - 1].date)}
				</div>
			</div>

			<!-- Big balances row -->
			<div class="relative mt-2 flex items-baseline gap-3">
				<span class="text-text-primary text-[34px] leading-none font-semibold tracking-tight tabular-nums">
					{fmt(endBalance)}
				</span>
				<span class="text-text-faint text-[11.5px]">{m.forecast_in_days_short({ days: DAYS })}</span>
			</div>

			<!-- Sparkline -->
			<svg
				viewBox="0 0 {HERO_W} {HERO_H}"
				class="mt-3 w-full"
				preserveAspectRatio="none"
				style="height: 140px;"
			>
				<defs>
					<linearGradient id="forecast-fill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.22" />
						<stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0.01" />
					</linearGradient>
				</defs>
				<path d={heroAreaPath} fill="url(#forecast-fill)" />
				{#if zeroLineY !== null}
					<line
						x1={HERO_PAD}
						x2={HERO_W - HERO_PAD}
						y1={zeroLineY}
						y2={zeroLineY}
						stroke="var(--color-expense)"
						stroke-width="1"
						stroke-dasharray="3 3"
						opacity="0.5"
					/>
				{/if}
				<path
					d={heroPath}
					fill="none"
					stroke="var(--color-accent)"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				{#if lowMarker}
					<circle cx={lowMarker.x} cy={lowMarker.y} r="6" fill="var(--color-expense)" opacity="0.18" />
					<circle cx={lowMarker.x} cy={lowMarker.y} r="3.5" fill="var(--color-expense)" />
				{/if}
				{#if endMarker}
					<circle cx={endMarker.x} cy={endMarker.y} r="6" fill="var(--color-accent)" opacity="0.18" />
					<circle cx={endMarker.x} cy={endMarker.y} r="3.5" fill="var(--color-accent)" />
				{/if}
			</svg>

			<div class="relative mt-3 grid grid-cols-3 gap-2">
				<div>
					<div class="t-label text-text-faint">{m.forecast_today()}</div>
					<div
						class="mt-0.5 font-mono text-[13px] font-semibold"
						style="font-variant-numeric: tabular-nums;"
					>
						{fmt(currentBalance)}
					</div>
				</div>
				<div>
					<div class="t-label text-text-faint">{m.forecast_lowest()}</div>
					<div
						class="mt-0.5 font-mono text-[13px] font-semibold tabular-nums"
						style="color: {minBalance < 0
							? 'var(--expense-ink)'
							: 'var(--color-text-primary)'};"
					>
						{fmt(minBalance)}
					</div>
					{#if lowestPoint}
						<div class="text-text-faint mono text-[10px]">{fmtDate(lowestPoint.date)}</div>
					{/if}
				</div>
				<div>
					<div class="t-label text-text-faint">{m.forecast_label_in_days_short({ days: DAYS })}</div>
					<div
						class="mt-0.5 font-mono text-[13px] font-semibold tabular-nums"
						style="color: {endBalance >= currentBalance
							? 'var(--income-ink)'
							: 'var(--expense-ink)'};"
					>
						{fmt(endBalance)}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Scenario chips -->
	<div class="mb-3.5">
		<ScenarioChips bind:active={scenarios} />
	</div>

	<!-- Warning banner -->
	{#if minBalance < 0}
		<div
			class="mb-3.5 flex items-center gap-2.5 rounded-[var(--radius-lg)] px-3.5 py-3"
			style="background: var(--expense-soft); border: 1px solid color-mix(in oklab, var(--color-expense) 25%, var(--color-border-default));"
		>
			<AlertTriangle size={15} style="color: var(--expense-ink);" />
			<p class="text-[12px] font-medium" style="color: var(--expense-ink);">
				{firstNegativeDate
					? m.forecast_warning_with_date({
							date: fmtDate(firstNegativeDate),
							amount: fmt(minBalance)
						})
					: m.forecast_warning_no_date({ amount: fmt(minBalance) })}
			</p>
		</div>
	{/if}

	<!-- Week summary carousel -->
	{#if weekSummaries.length > 0}
		<div class="mb-3.5">
			<div class="t-label text-text-subtle mb-2 px-0.5">{m.forecast_weekly_outlook()}</div>
			<div
				class="flex gap-2.5 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden"
				style="scroll-snap-type: x mandatory;"
			>
				{#each weekSummaries as week, i (i)}
					<div
						class="shrink-0 rounded-[var(--radius-lg)] border p-3"
						style="width: 144px; scroll-snap-align: start; {week.isCurrent
							? 'border-color: var(--color-accent); background: var(--accent-soft);'
							: week.endBalance < 0
								? 'border-color: color-mix(in oklab, var(--color-expense) 25%, var(--color-border-default)); background: var(--expense-soft);'
								: 'border-color: var(--color-border-default); background: var(--color-surface-1);'}"
					>
						<div class="text-text-subtle text-[10px] font-medium">
							{#if week.isCurrent}<span class="mr-1">📍</span>{/if}{fmtDate(week.start)} – {fmtDate(
								week.end
							)}
						</div>
						<div
							class="mt-1.5 font-mono text-[14px] font-semibold tabular-nums"
							style="color: {week.endBalance < 0
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
	<div class="t-label text-text-subtle mb-2 px-0.5">{m.forecast_events()}</div>

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
							class="font-mono text-[12px] font-semibold tabular-nums"
							style="color: {point.balance >= 0
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
								class="font-mono text-[12px] tabular-nums"
								style="color: {ev.type === 'income'
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
		<EmptyState
			emoji="🌤️"
			title={m.forecast_calm_title({ days: DAYS })}
			sub={m.forecast_calm_sub()}
		/>
	{/if}
</div>
