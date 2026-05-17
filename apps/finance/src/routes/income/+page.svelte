<script lang="ts">
	import IncomeForm from '$lib/components/income/IncomeForm.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { Plus } from 'lucide-svelte';
	import { normalizeToMonthly, formatCurrency, getIntlLocale } from '$lib/utils';

	import type { Income } from '$lib/types';

	let { data } = $props();

	// ── Form state ───────────────────────────────────────────────────────────
	let showForm = $state(false);
	let editing = $state<Income | null>(null);

	// ── Tab + sort/filter state ───────────────────────────────────────────────
	type TabId = 'recurring' | 'once' | 'past';
	let activeTab = $state<TabId>('recurring');
	let sortBy = $state<'date' | 'amount'>('date');
	let sortDir = $state<'asc' | 'desc'>('asc');

	function switchTab(id: string) {
		activeTab = id as TabId;
		sortBy = 'date';
		sortDir = id === 'past' ? 'desc' : 'asc';
	}

	// ── Static config ─────────────────────────────────────────────────────────
	const fmt = (n: number) => formatCurrency(n, data.settings?.currency, data.settings?.hideCents);

	// ── Derived partitions ────────────────────────────────────────────────────
	const recurringIncome = $derived(data.incomeItems.filter((i: Income) => i.recurrence !== 'once'));
	const onceIncome = $derived(
		data.incomeItems.filter((i: Income) => i.recurrence === 'once' && !i.received)
	);
	const pastIncome = $derived(
		data.incomeItems.filter((i: Income) => i.recurrence === 'once' && i.received)
	);

	const monthlyTotal = $derived(
		recurringIncome.reduce(
			(s: number, i: Income) => s + normalizeToMonthly(i.amount, i.recurrence),
			0
		)
	);

	const tabCounts = $derived({
		recurring: recurringIncome.length,
		once: onceIncome.length,
		past: pastIncome.length
	});

	const incomeTabs = $derived([
		{ id: 'recurring', label: 'Recurring', count: tabCounts.recurring },
		{ id: 'once', label: 'One-time', count: tabCounts.once },
		{ id: 'past', label: 'Past', count: tabCounts.past }
	]);

	// ── Monthly breakdown ─────────────────────────────────────────────────────
	const RECURRENCE_ORDER = ['monthly', 'weekly', 'biweekly', 'quarterly', 'half-yearly', 'yearly'];
	const RECURRENCE_LABELS: Record<string, string> = {
		monthly: 'Monthly',
		weekly: 'Weekly',
		biweekly: 'Biweekly',
		quarterly: 'Quarterly',
		'half-yearly': 'Half-yearly',
		yearly: 'Yearly'
	};

	const monthlyBreakdown = $derived.by(() => {
		const rows: { recurrence: string; label: string; raw: number; monthly: number }[] = [];
		for (const recurrence of RECURRENCE_ORDER) {
			const items = recurringIncome.filter((i: Income) => i.recurrence === recurrence);
			if (items.length === 0) continue;
			const raw = items.reduce((s: number, i: Income) => s + i.amount, 0);
			const monthly = items.reduce(
				(s: number, i: Income) => s + normalizeToMonthly(i.amount, i.recurrence),
				0
			);
			rows.push({ recurrence, label: RECURRENCE_LABELS[recurrence] ?? recurrence, raw, monthly });
		}
		return rows;
	});

	// ── Filter + sort helpers ─────────────────────────────────────────────────
	function dateVal(s: string | null, dir: 'asc' | 'desc'): number {
		if (!s) return dir === 'asc' ? Infinity : -Infinity;
		return new Date(s).getTime();
	}

	function pillClass(isActive: boolean): string {
		return isActive
			? 'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors border-[var(--accent-line)] bg-[var(--income-soft)] text-[var(--income-ink)]'
			: 'shrink-0 rounded-full border border-border-default px-3 py-1.5 text-[11px] text-text-muted transition-colors hover:border-[var(--accent-line)]';
	}

	// ── Derived views (with sort applied) ────────────────────────────────────
	const recurringView = $derived.by(() => {
		let list = recurringIncome.slice() as Income[];
		if (sortBy === 'amount') {
			list.sort((a, b) => (sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount));
		}

		const groups: {
			recurrence: string;
			label: string;
			items: Income[];
			subtotal: number;
			monthlyEquiv: number;
			count: number;
		}[] = [];
		for (const recurrence of RECURRENCE_ORDER) {
			const items = list.filter((i) => i.recurrence === recurrence);
			if (items.length === 0) continue;
			groups.push({
				recurrence,
				label: RECURRENCE_LABELS[recurrence] ?? recurrence,
				items,
				subtotal: items.reduce((s, i) => s + i.amount, 0),
				monthlyEquiv: items.reduce((s, i) => s + normalizeToMonthly(i.amount, i.recurrence), 0),
				count: items.length
			});
		}
		const known = new Set(RECURRENCE_ORDER);
		const rest = list.filter((i) => !known.has(i.recurrence));
		if (rest.length > 0) {
			groups.push({
				recurrence: 'other',
				label: 'Other',
				items: rest,
				subtotal: rest.reduce((s, i) => s + i.amount, 0),
				monthlyEquiv: rest.reduce((s, i) => s + normalizeToMonthly(i.amount, i.recurrence), 0),
				count: rest.length
			});
		}
		return groups;
	});

	const onceView = $derived.by(() => {
		let list = onceIncome.slice() as Income[];
		if (sortBy === 'amount') {
			list.sort((a, b) => (sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount));
		} else {
			list.sort((a, b) => dateVal(a.expectedDate, sortDir) - dateVal(b.expectedDate, sortDir));
		}
		return list;
	});

	const pastView = $derived.by(() => {
		let list = pastIncome.slice() as Income[];
		if (sortBy === 'amount') {
			list.sort((a, b) => (sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount));
		} else {
			list.sort((a, b) => {
				const av = a.expectedDate
					? new Date(a.expectedDate).getTime()
					: new Date(a.createdAt).getTime();
				const bv = b.expectedDate
					? new Date(b.expectedDate).getTime()
					: new Date(b.createdAt).getTime();
				return sortDir === 'desc' ? bv - av : av - bv;
			});
		}
		return list;
	});

	// ── Formatting helpers ────────────────────────────────────────────────────
	function dayLabel(inc: Income): string {
		if (inc.dayOfMonth === 'last_working') return 'Last working day';
		if (inc.dayOfMonth === 'second_last_working') return '2nd-last working day';
		if (inc.dayOfMonth) return `${inc.dayOfMonth}. of month`;
		return '';
	}

	function dueDateLabel(inc: Income): string {
		if (!inc.expectedDate) return 'no date set';
		return `expected ${new Date(inc.expectedDate).toLocaleDateString(getIntlLocale(), { day: 'numeric', month: 'short' })}`;
	}

	// ── Form handlers ─────────────────────────────────────────────────────────
	function openNew() {
		editing = null;
		showForm = true;
	}

	function openEdit(inc: Income) {
		editing = inc;
		showForm = true;
	}
</script>

<div class="flex flex-col gap-5 px-4 pt-5 pb-8">
	<!-- Header -->
	<header class="flex items-start justify-between">
		<div>
			<h1 class="text-text-primary text-[26px] leading-tight font-semibold tracking-tight">
				Income
			</h1>
			<p class="text-text-subtle mt-0.5 text-[13px]">Track what comes in, on cadence.</p>
		</div>
		<button
			type="button"
			onclick={openNew}
			class="bg-income flex h-[38px] w-[38px] items-center justify-center rounded-full text-white shadow-sm transition-transform active:scale-95"
			aria-label="Add income"
		>
			<Plus size={18} strokeWidth={2.5} />
		</button>
	</header>

	<!-- Tabs -->
	<Tabs tabs={incomeTabs} active={activeTab} onchange={switchTab} />

	<!-- Recurring Tab -->
	{#if activeTab === 'recurring'}
		<!-- Monthly Equivalent Card -->
		<div
			class="rounded-[var(--radius-lg)] border p-4"
			style="background: var(--income-soft); border-color: color-mix(in oklab, var(--color-income) 25%, var(--color-border-default));"
		>
			<div class="flex items-center justify-between">
				<span class="mono text-[10px] tracking-wider uppercase" style="color: var(--income-ink);">
					Monthly Equivalent
				</span>
				<span class="text-[22px] font-semibold tabular-nums" style="color: var(--income-ink);">
					{fmt(monthlyTotal)}
				</span>
			</div>
			{#if monthlyBreakdown.length > 1}
				<div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
					{#each monthlyBreakdown as row (row.recurrence)}
						<div class="flex items-center justify-between">
							<span class="text-text-muted text-[11px]">{row.label}</span>
							<span
								class="font-mono text-[11px] font-medium tabular-nums"
								style="color: var(--income-ink);">{fmt(row.monthly)}</span
							>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Filter pills -->
		<div class="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
			<button
				type="button"
				onclick={() => {
					sortBy = 'amount';
					sortDir = 'desc';
				}}
				class={pillClass(sortBy === 'amount' && sortDir === 'desc')}
			>
				Most income
			</button>
			<button
				type="button"
				onclick={() => {
					sortBy = 'amount';
					sortDir = 'asc';
				}}
				class={pillClass(sortBy === 'amount' && sortDir === 'asc')}
			>
				Smallest first
			</button>
		</div>

		<!-- Grouped list -->
		<div class="flex flex-col gap-5">
			{#each recurringView as group (group.recurrence)}
				<section>
					<!-- Group header -->
					<div class="mb-2 flex items-baseline justify-between">
						<span class="text-text-subtle text-[11px] font-semibold tracking-wider uppercase">
							{group.label} &middot; {group.count}
						</span>
						{#if group.subtotal > 0}
							<span class="text-text-muted font-mono text-[11px] font-medium tabular-nums">
								{fmt(group.subtotal)}
							</span>
						{/if}
					</div>
					<!-- Line-list card -->
					<div
						class="divide-border-subtle border-border-default bg-surface-1 divide-y overflow-hidden rounded-[var(--radius-lg)] border"
					>
						{#each group.items as inc (inc.id)}
							<button
								type="button"
								onclick={() => openEdit(inc)}
								class="hover:bg-bg-1 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
							>
								<!-- Emoji -->
								<div
									class="bg-bg-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
								>
									💵
								</div>
								<!-- Name + meta -->
								<div class="min-w-0 flex-1">
									<p class="text-text-primary truncate text-[14px] font-medium">
										{inc.name}
									</p>
									<p class="text-text-subtle text-[11px]">
										{dayLabel(inc)}
									</p>
								</div>
								<!-- Amount -->
								<span
									class="shrink-0 font-mono text-[14px] font-semibold tabular-nums"
									style="color: var(--income-ink);"
								>
									{fmt(inc.amount)}
								</span>
							</button>
						{/each}
					</div>
				</section>
			{/each}

			{#if recurringView.length === 0}
				<div
					class="border-border-default rounded-[var(--radius-lg)] border border-dashed p-8 text-center"
				>
					<p class="text-text-muted text-[13px]">No recurring income yet.</p>
				</div>
			{/if}
		</div>

		<!-- One-time Tab -->
	{:else if activeTab === 'once'}
		<!-- Filter pills -->
		<div class="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
			<button
				type="button"
				onclick={() => {
					sortBy = 'date';
					sortDir = 'asc';
				}}
				class={pillClass(sortBy === 'date' && sortDir === 'asc')}
			>
				Soonest first
			</button>
			<button
				type="button"
				onclick={() => {
					sortBy = 'date';
					sortDir = 'desc';
				}}
				class={pillClass(sortBy === 'date' && sortDir === 'desc')}
			>
				Latest first
			</button>
			<button
				type="button"
				onclick={() => {
					sortBy = 'amount';
					sortDir = 'desc';
				}}
				class={pillClass(sortBy === 'amount' && sortDir === 'desc')}
			>
				Highest first
			</button>
		</div>

		<!-- Line-list card -->
		{#if onceView.length > 0}
			<div
				class="divide-border-subtle border-border-default bg-surface-1 divide-y overflow-hidden rounded-[var(--radius-lg)] border"
			>
				{#each onceView as inc (inc.id)}
					<button
						type="button"
						onclick={() => openEdit(inc)}
						class="hover:bg-bg-1 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
					>
						<div
							class="bg-bg-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
						>
							📥
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-text-primary truncate text-[14px] font-medium">
								{inc.name}
							</p>
							<p class="text-text-subtle text-[11px]">
								{dueDateLabel(inc)}
							</p>
						</div>
						<span
							class="shrink-0 font-mono text-[14px] font-semibold tabular-nums"
							style="color: var(--income-ink);"
						>
							{fmt(inc.amount)}
						</span>
					</button>
				{/each}
			</div>
		{:else}
			<div
				class="border-border-default rounded-[var(--radius-lg)] border border-dashed p-8 text-center"
			>
				<p class="text-text-muted text-[13px]">No upcoming one-time income.</p>
			</div>
		{/if}

		<!-- Past Tab -->
	{:else if activeTab === 'past'}
		<!-- Filter pills -->
		<div class="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
			<button
				type="button"
				onclick={() => {
					sortBy = 'date';
					sortDir = 'desc';
				}}
				class={pillClass(sortBy === 'date' && sortDir === 'desc')}
			>
				Most recent
			</button>
			<button
				type="button"
				onclick={() => {
					sortBy = 'date';
					sortDir = 'asc';
				}}
				class={pillClass(sortBy === 'date' && sortDir === 'asc')}
			>
				Oldest first
			</button>
			<button
				type="button"
				onclick={() => {
					sortBy = 'amount';
					sortDir = 'desc';
				}}
				class={pillClass(sortBy === 'amount' && sortDir === 'desc')}
			>
				Highest first
			</button>
			<button
				type="button"
				onclick={() => {
					sortBy = 'amount';
					sortDir = 'asc';
				}}
				class={pillClass(sortBy === 'amount' && sortDir === 'asc')}
			>
				Lowest first
			</button>
		</div>

		<!-- Line-list card -->
		{#if pastView.length > 0}
			<div
				class="divide-border-subtle border-border-default bg-surface-1 divide-y overflow-hidden rounded-[var(--radius-lg)] border"
			>
				{#each pastView as inc (inc.id)}
					<button
						type="button"
						onclick={() => openEdit(inc)}
						class="hover:bg-bg-1 flex w-full items-center gap-3 px-4 py-3 text-left opacity-55 transition-colors"
					>
						<div
							class="bg-bg-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
						>
							✓
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-text-primary truncate text-[14px] font-medium line-through">
								{inc.name}
							</p>
							<p class="text-text-subtle text-[11px]">
								{dueDateLabel(inc)} &middot; received
							</p>
						</div>
						<span
							class="shrink-0 font-mono text-[14px] font-semibold tabular-nums line-through"
							style="color: var(--income-ink);"
						>
							{fmt(inc.amount)}
						</span>
					</button>
				{/each}
			</div>
		{:else}
			<div
				class="border-border-default rounded-[var(--radius-lg)] border border-dashed p-8 text-center"
			>
				<p class="text-text-muted text-[13px]">Received income will appear here.</p>
			</div>
		{/if}
	{/if}
</div>

<IncomeForm
	bind:open={showForm}
	{editing}
	accounts={data.accounts}
	defaultAccountId={data.settings?.defaultAccountId}
/>
