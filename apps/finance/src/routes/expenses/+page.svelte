<script lang="ts">
	import ExpenseForm from '$lib/components/expenses/ExpenseForm.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { PageHeader } from '@nexo/ui';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import { Plus } from '@lucide/svelte';
	import { normalizeToMonthly, formatCurrency, getIntlLocale } from '$lib/utils';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { m } from '$lib/paraglide/messages.js';

	import type { Expense } from '$lib/types';

	let { data } = $props();

	// ── Form state ───────────────────────────────────────────────────────────
	let showForm = $state(false);
	let editing = $state<Expense | null>(null);

	// ── Tab + sort/filter state ───────────────────────────────────────────────
	type TabId = 'recurring' | 'once' | 'past';
	let activeTab = $state<TabId>('recurring');
	let sortBy = $state<'date' | 'amount'>('date');
	let sortDir = $state<'asc' | 'desc'>('asc');
	let filterStatus = $state<'all' | 'active' | 'paused'>('all');
	let filterCategory = $state<string | null>(null);

	function switchTab(id: string) {
		activeTab = id as TabId;
		sortBy = 'date';
		sortDir = id === 'past' ? 'desc' : 'asc';
		filterStatus = 'all';
		filterCategory = null;
	}

	// ── Static config ─────────────────────────────────────────────────────────
	const fmt = (n: number) => formatCurrency(n, data.settings?.currency, data.settings?.hideCents);

	const CATEGORY_EMOJI: Record<string, string> = {
		housing: '\u{1F3E0}',
		utilities: '\u{1F4A1}',
		subscription: '\u{1F4FA}',
		food: '\u{1F6D2}',
		transport: '\u{1F686}',
		insurance: '\u{1F6E1}️',
		other: '\u{1F4E6}'
	};

	// ── Derived partitions ────────────────────────────────────────────────────
	const recurringExpenses = $derived(data.expenses.filter((e: Expense) => e.recurrence !== 'once'));
	const onceExpenses = $derived(
		data.expenses.filter((e: Expense) => e.recurrence === 'once' && e.active)
	);
	const pastExpenses = $derived(
		data.expenses.filter((e: Expense) => e.recurrence === 'once' && !e.active)
	);

	const monthlyTotal = $derived(
		recurringExpenses
			.filter((e: Expense) => e.active)
			.reduce((s: number, e: Expense) => s + normalizeToMonthly(e.amount, e.recurrence), 0)
	);

	const tabCounts = $derived({
		recurring: recurringExpenses.length,
		once: onceExpenses.length,
		past: pastExpenses.length
	});

	const expenseTabs = $derived([
		{ id: 'recurring', label: m.expenses_tab_recurring(), count: tabCounts.recurring },
		{ id: 'once', label: m.expenses_tab_once(), count: tabCounts.once },
		{ id: 'past', label: m.expenses_tab_past(), count: tabCounts.past }
	]);

	const availableCategories = $derived(
		[...new Set(onceExpenses.map((e: Expense) => e.category))].sort() as string[]
	);

	// ── Monthly breakdown ─────────────────────────────────────────────────────
	const RECURRENCE_ORDER = ['monthly', 'weekly', 'biweekly', 'quarterly', 'half-yearly', 'yearly'];
	const RECURRENCE_LABELS: Record<string, string> = $derived({
		monthly: m.recurrence_monthly(),
		weekly: m.recurrence_weekly(),
		biweekly: m.recurrence_biweekly(),
		quarterly: m.recurrence_quarterly(),
		'half-yearly': m.recurrence_half_yearly(),
		yearly: m.recurrence_yearly()
	});

	const monthlyBreakdown = $derived.by(() => {
		const rows: { recurrence: string; label: string; raw: number; monthly: number }[] = [];
		for (const recurrence of RECURRENCE_ORDER) {
			const active = recurringExpenses.filter(
				(e: Expense) => e.active && e.recurrence === recurrence
			);
			if (active.length === 0) continue;
			const raw = active.reduce((s: number, e: Expense) => s + e.amount, 0);
			const monthly = active.reduce(
				(s: number, e: Expense) => s + normalizeToMonthly(e.amount, e.recurrence),
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
			? 'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors border-[var(--expense-line)] bg-[var(--expense-soft)] text-[var(--expense-ink)]'
			: 'shrink-0 rounded-full border border-border-default px-3 py-1.5 text-[11px] text-text-muted transition-colors hover:border-[var(--expense-line)]';
	}

	// ── Derived views (with sort + filter applied) ────────────────────────────
	const recurringView = $derived.by(() => {
		let list = recurringExpenses.slice() as Expense[];
		if (filterStatus === 'active') list = list.filter((e) => e.active);
		if (filterStatus === 'paused') list = list.filter((e) => !e.active);
		if (sortBy === 'amount') {
			list.sort((a, b) => (sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount));
		} else {
			list.sort((a, b) => (a.active === b.active ? 0 : a.active ? -1 : 1));
		}

		const groups: {
			recurrence: string;
			label: string;
			items: Expense[];
			subtotal: number;
			monthlyEquiv: number;
			count: number;
		}[] = [];
		for (const recurrence of RECURRENCE_ORDER) {
			const items = list.filter((e) => e.recurrence === recurrence);
			if (items.length === 0) continue;
			const active = items.filter((e) => e.active);
			groups.push({
				recurrence,
				label: RECURRENCE_LABELS[recurrence] ?? recurrence,
				items,
				subtotal: active.reduce((s, e) => s + e.amount, 0),
				monthlyEquiv: active.reduce((s, e) => s + normalizeToMonthly(e.amount, e.recurrence), 0),
				count: items.length
			});
		}
		// catch-all for any recurrence not in the order list
		const known = new Set(RECURRENCE_ORDER);
		const rest = list.filter((e) => !known.has(e.recurrence));
		if (rest.length > 0) {
			const active = rest.filter((e) => e.active);
			groups.push({
				recurrence: 'other',
				label: m.recurrence_other(),
				items: rest,
				subtotal: active.reduce((s, e) => s + e.amount, 0),
				monthlyEquiv: active.reduce((s, e) => s + normalizeToMonthly(e.amount, e.recurrence), 0),
				count: rest.length
			});
		}
		return groups;
	});

	const onceView = $derived.by(() => {
		let list = onceExpenses.slice() as Expense[];
		if (filterCategory) list = list.filter((e) => e.category === filterCategory);
		if (sortBy === 'amount') {
			list.sort((a, b) => (sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount));
		} else {
			list.sort((a, b) => dateVal(a.dueDate, sortDir) - dateVal(b.dueDate, sortDir));
		}
		return list;
	});

	const pastView = $derived.by(() => {
		let list = pastExpenses.slice() as Expense[];
		if (sortBy === 'amount') {
			list.sort((a, b) => (sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount));
		} else {
			list.sort((a, b) => {
				const av = a.dueDate ? new Date(a.dueDate).getTime() : new Date(a.createdAt).getTime();
				const bv = b.dueDate ? new Date(b.dueDate).getTime() : new Date(b.createdAt).getTime();
				return sortDir === 'desc' ? bv - av : av - bv;
			});
		}
		return list;
	});

	// ── Formatting helpers ────────────────────────────────────────────────────
	function dayLabel(expense: Expense): string {
		if (expense.dayOfMonth === 'last_working') return m.expenses_last_working_day();
		if (expense.dayOfMonth === 'second_last_working') return m.expenses_second_last_working_day();
		if (expense.dayOfMonth) return m.expenses_day_of_month({ day: expense.dayOfMonth });
		return '';
	}

	function dueDateLabel(expense: Expense): string {
		if (!expense.dueDate) return m.expenses_no_due_date();
		return m.expenses_due_on({
			date: new Date(expense.dueDate).toLocaleDateString(getIntlLocale(), {
				day: 'numeric',
				month: 'short'
			})
		});
	}

	// ── Form handlers ─────────────────────────────────────────────────────────
	function openNew() {
		editing = null;
		showForm = true;
	}

	function openEdit(expense: Expense) {
		editing = expense;
		showForm = true;
	}

	$effect(() => {
		if (page.url.searchParams.get('add') === 'true') {
			openNew();
			const url = new URL(page.url);
			url.searchParams.delete('add');
			replaceState(url.pathname + url.search, page.state);
		}
	});
</script>

<div class="page flex flex-col gap-5">
	<PageHeader title={m.expenses_title()} subtitle={m.expenses_subtitle()}>
		{#snippet actions()}
			<button
				type="button"
				onclick={openNew}
				class="bg-expense flex h-[38px] w-[38px] items-center justify-center rounded-full text-white shadow-sm transition-transform active:scale-95"
				aria-label={m.expenses_add_aria()}
			>
				<Plus size={18} strokeWidth={2.5} />
			</button>
		{/snippet}
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
	</PageHeader>

	<!-- Tabs -->
	<Tabs tabs={expenseTabs} active={activeTab} onchange={switchTab} />

	<!-- Recurring Tab -->
	{#if activeTab === 'recurring'}
		<!-- Monthly Equivalent Card -->
		<div
			class="rounded-[var(--radius-lg)] border p-4"
			style="background: var(--expense-soft); border-color: var(--accent-line);"
		>
			<div class="flex items-center justify-between">
				<span class="mono text-[10px] tracking-wider uppercase" style="color: var(--expense-ink);">
					{m.expenses_monthly_equivalent()}
				</span>
				<span class="text-[22px] font-semibold tabular-nums" style="color: var(--expense-ink);">
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
								style="color: var(--expense-ink);">{fmt(row.monthly)}</span
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
				onclick={() => (filterStatus = 'all')}
				class={pillClass(filterStatus === 'all')}
			>
				{m.expenses_filter_all()}
			</button>
			<button
				type="button"
				onclick={() => (filterStatus = 'active')}
				class={pillClass(filterStatus === 'active')}
			>
				{m.expenses_filter_active()}
			</button>
			<button
				type="button"
				onclick={() => (filterStatus = 'paused')}
				class={pillClass(filterStatus === 'paused')}
			>
				{m.expenses_filter_paused()}
			</button>
			<span class="text-text-faint self-center text-[11px]">|</span>
			<button
				type="button"
				onclick={() => {
					sortBy = 'amount';
					sortDir = 'desc';
				}}
				class={pillClass(sortBy === 'amount' && sortDir === 'desc')}
			>
				{m.expenses_sort_most_expensive()}
			</button>
			<button
				type="button"
				onclick={() => {
					sortBy = 'amount';
					sortDir = 'asc';
				}}
				class={pillClass(sortBy === 'amount' && sortDir === 'asc')}
			>
				{m.expenses_sort_cheapest()}
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
						{#each group.items as expense (expense.id)}
							<button
								type="button"
								onclick={() => openEdit(expense)}
								class="hover:bg-bg-1 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors {!expense.active
									? 'opacity-55'
									: ''}"
							>
								<!-- Category emoji -->
								<div
									class="bg-bg-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
								>
									{CATEGORY_EMOJI[expense.category] ?? '\u{1F4E6}'}
								</div>
								<!-- Name + meta -->
								<div class="min-w-0 flex-1">
									<p
										class="text-text-primary truncate text-[14px] font-medium {!expense.active
											? 'line-through'
											: ''}"
									>
										{expense.name}{#if !expense.active}<span class="text-text-faint font-normal">
												&middot; paused</span
											>{/if}
									</p>
									<p class="text-text-subtle text-[11px]">
										{dayLabel(expense)}
									</p>
								</div>
								<!-- Amount -->
								<span
									class="shrink-0 font-mono text-[14px] font-semibold tabular-nums {!expense.active
										? 'line-through'
										: ''}"
									style="color: var(--expense-ink);"
								>
									{fmt(expense.amount)}
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
					<p class="text-text-muted text-[13px]">{m.expenses_empty_recurring()}</p>
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
				{m.expenses_sort_soonest()}
			</button>
			<button
				type="button"
				onclick={() => {
					sortBy = 'date';
					sortDir = 'desc';
				}}
				class={pillClass(sortBy === 'date' && sortDir === 'desc')}
			>
				{m.expenses_sort_latest()}
			</button>
			<button
				type="button"
				onclick={() => {
					sortBy = 'amount';
					sortDir = 'desc';
				}}
				class={pillClass(sortBy === 'amount' && sortDir === 'desc')}
			>
				{m.expenses_sort_most_expensive()}
			</button>
			{#if availableCategories.length > 1}
				<span class="text-text-faint self-center text-[11px]">|</span>
				{#each availableCategories as cat (cat)}
					<button
						type="button"
						onclick={() => (filterCategory = filterCategory === cat ? null : cat)}
						class="{pillClass(filterCategory === cat)} capitalize"
					>
						{cat}
					</button>
				{/each}
			{/if}
		</div>

		<!-- Line-list card -->
		{#if onceView.length > 0}
			<div
				class="divide-border-subtle border-border-default bg-surface-1 divide-y overflow-hidden rounded-[var(--radius-lg)] border"
			>
				{#each onceView as expense (expense.id)}
					<button
						type="button"
						onclick={() => openEdit(expense)}
						class="hover:bg-bg-1 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
					>
						<div
							class="bg-bg-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
						>
							{CATEGORY_EMOJI[expense.category] ?? '\u{1F4E6}'}
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-text-primary truncate text-[14px] font-medium">
								{expense.name}
							</p>
							<p class="text-text-subtle text-[11px]">
								{dueDateLabel(expense)}
							</p>
						</div>
						<span
							class="shrink-0 font-mono text-[14px] font-semibold tabular-nums"
							style="color: var(--expense-ink);"
						>
							{fmt(expense.amount)}
						</span>
					</button>
				{/each}
			</div>
		{:else}
			<div
				class="border-border-default rounded-[var(--radius-lg)] border border-dashed p-8 text-center"
			>
				<p class="text-text-muted text-[13px]">{m.expenses_empty_once()}</p>
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
				{m.expenses_sort_recent()}
			</button>
			<button
				type="button"
				onclick={() => {
					sortBy = 'date';
					sortDir = 'asc';
				}}
				class={pillClass(sortBy === 'date' && sortDir === 'asc')}
			>
				{m.expenses_sort_oldest()}
			</button>
			<button
				type="button"
				onclick={() => {
					sortBy = 'amount';
					sortDir = 'desc';
				}}
				class={pillClass(sortBy === 'amount' && sortDir === 'desc')}
			>
				{m.expenses_sort_highest()}
			</button>
			<button
				type="button"
				onclick={() => {
					sortBy = 'amount';
					sortDir = 'asc';
				}}
				class={pillClass(sortBy === 'amount' && sortDir === 'asc')}
			>
				{m.expenses_sort_lowest()}
			</button>
		</div>

		<!-- Line-list card -->
		{#if pastView.length > 0}
			<div
				class="divide-border-subtle border-border-default bg-surface-1 divide-y overflow-hidden rounded-[var(--radius-lg)] border"
			>
				{#each pastView as expense (expense.id)}
					<button
						type="button"
						onclick={() => openEdit(expense)}
						class="hover:bg-bg-1 flex w-full items-center gap-3 px-4 py-3 text-left opacity-55 transition-colors"
					>
						<div
							class="bg-bg-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
						>
							{CATEGORY_EMOJI[expense.category] ?? '\u{1F4E6}'}
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-text-primary truncate text-[14px] font-medium line-through">
								{expense.name}
							</p>
							<p class="text-text-subtle text-[11px]">
								{dueDateLabel(expense)}{m.expense_row_paid_dot()}
							</p>
						</div>
						<span
							class="shrink-0 font-mono text-[14px] font-semibold tabular-nums line-through"
							style="color: var(--expense-ink);"
						>
							{fmt(expense.amount)}
						</span>
					</button>
				{/each}
			</div>
		{:else}
			<div
				class="border-border-default rounded-[var(--radius-lg)] border border-dashed p-8 text-center"
			>
				<p class="text-text-muted text-[13px]">{m.expenses_empty_past()}</p>
			</div>
		{/if}
	{/if}
</div>

<ExpenseForm
	bind:open={showForm}
	{editing}
	accounts={data.accounts}
	defaultAccountId={data.settings?.defaultAccountId}
	currency={data.settings?.currency ?? 'EUR'}
/>
