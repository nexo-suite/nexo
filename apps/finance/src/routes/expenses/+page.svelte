<script lang="ts">
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import ExpenseRow from '$lib/components/expenses/ExpenseRow.svelte';
	import BottomSheet from '$lib/components/layout/BottomSheet.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { Plus, ChevronDown } from 'lucide-svelte';
	import { normalizeToMonthly } from '$lib/utils';
	import { enhance } from '$app/forms';

	import type { Expense } from '$lib/types';

	let { data } = $props();

	// ── Form state ───────────────────────────────────────────────────────────
	let showForm = $state(false);
	let editing = $state<Expense | null>(null);
	let confirmDelete = $state(false);
	let form = $state({
		name: '',
		category: 'other',
		amount: '',
		recurrence: 'monthly',
		day_of_month: '',
		due_date: '',
		starting_month: '',
		active: true,
		paid: false
	});

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
	const categories = [
		'housing',
		'utilities',
		'subscription',
		'insurance',
		'food',
		'transport',
		'other'
	];
	const recurrences = [
		'once',
		'weekly',
		'biweekly',
		'monthly',
		'quarterly',
		'half-yearly',
		'yearly'
	];
	const months = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];
	const fmt = (n: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(n);

	// ── Derived partitions ────────────────────────────────────────────────────
	const needsMonth = $derived(['quarterly', 'half-yearly', 'yearly'].includes(form.recurrence));
	const isOnce = $derived(form.recurrence === 'once');

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
		{ id: 'recurring', label: 'Recurring', count: tabCounts.recurring },
		{ id: 'once', label: 'One-time', count: tabCounts.once },
		{ id: 'past', label: 'Past', count: tabCounts.past }
	]);

	const availableCategories = $derived(
		[...new Set(onceExpenses.map((e: Expense) => e.category))].sort() as string[]
	);

	const BREAKDOWN_LABEL: Record<string, string> = {
		weekly: '× 52 ÷ 12',
		biweekly: '× 26 ÷ 12',
		monthly: '× 1',
		quarterly: '÷ 3',
		'half-yearly': '÷ 6',
		yearly: '÷ 12'
	};

	let breakdownOpen = $state(false);

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
	function dateVal(s: string | null, dir: 'asc' | 'desc'): number {
		if (!s) return dir === 'asc' ? Infinity : -Infinity;
		return new Date(s).getTime();
	}

	function pillClass(isActive: boolean): string {
		return isActive
			? 'shrink-0 rounded-full border border-expense bg-expense/10 px-3 py-1.5 text-xs font-medium text-expense transition-colors'
			: 'shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-neutral transition-colors hover:border-expense/40';
	}

	// ── Derived views (with sort + filter applied) ────────────────────────────
	const RECURRENCE_ORDER = ['monthly', 'weekly', 'biweekly', 'quarterly', 'half-yearly', 'yearly'];
	const RECURRENCE_LABELS: Record<string, string> = {
		monthly: 'Monthly',
		weekly: 'Weekly',
		biweekly: 'Every two weeks',
		quarterly: 'Quarterly',
		'half-yearly': 'Every 6 months',
		yearly: 'Yearly'
	};

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
				monthlyEquiv: active.reduce((s, e) => s + normalizeToMonthly(e.amount, e.recurrence), 0)
			});
		}
		// catch-all for any recurrence not in the order list
		const known = new Set(RECURRENCE_ORDER);
		const rest = list.filter((e) => !known.has(e.recurrence));
		if (rest.length > 0) {
			const active = rest.filter((e) => e.active);
			groups.push({
				recurrence: 'other',
				label: 'Other',
				items: rest,
				subtotal: active.reduce((s, e) => s + e.amount, 0),
				monthlyEquiv: active.reduce((s, e) => s + normalizeToMonthly(e.amount, e.recurrence), 0)
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

	// ── Form handlers ─────────────────────────────────────────────────────────
	function openNew() {
		editing = null;
		confirmDelete = false;
		form = {
			name: '',
			category: 'other',
			amount: '',
			recurrence: 'monthly',
			day_of_month: '',
			due_date: '',
			starting_month: '',
			active: true,
			paid: false
		};
		showForm = true;
	}

	function openEdit(expense: Expense) {
		editing = expense;
		confirmDelete = false;
		const once = expense.recurrence === 'once';
		form = {
			name: expense.name,
			category: expense.category,
			amount: String(expense.amount),
			recurrence: expense.recurrence,
			day_of_month: expense.dayOfMonth ?? '',
			due_date: expense.dueDate ?? '',
			starting_month: expense.startingMonth ?? '',
			active: expense.active,
			paid: once ? !expense.active : false
		};
		showForm = true;
	}
</script>

<div class="pb-6">
	<div class="px-4 pt-4">
		<PageHeader title="Expenses" user={data.user} displayName={data.settings.displayName}>
			{#snippet actions()}
				<button
					type="button"
					onclick={openNew}
					class="flex items-center gap-1 rounded-md bg-expense px-3 py-1.5 text-xs font-medium text-white"
				>
					<Plus size={14} /> Add
				</button>
			{/snippet}
		</PageHeader>
	</div>

	<div class="mx-4 mb-4 overflow-hidden rounded-lg border border-border bg-surface">
		<button
			type="button"
			onclick={() => (breakdownOpen = !breakdownOpen)}
			class="flex w-full items-center justify-between px-4 py-3 text-sm"
		>
			<span class="text-neutral">Monthly equivalent</span>
			<div class="flex items-center gap-2">
				<span class="font-semibold text-expense tabular-nums">{fmt(monthlyTotal)}</span>
				<ChevronDown
					size={14}
					class="text-neutral transition-transform duration-200 {breakdownOpen ? 'rotate-180' : ''}"
				/>
			</div>
		</button>
		{#if breakdownOpen}
			<div class="space-y-2 border-t border-border px-4 py-3">
				{#each monthlyBreakdown as row (row.recurrence)}
					<div class="flex items-center justify-between text-xs">
						<div class="flex min-w-0 items-center gap-2 text-neutral">
							<span class="w-24 shrink-0 capitalize">{row.label}</span>
							<span class="shrink-0 tabular-nums">{fmt(row.raw)}</span>
							<span class="shrink-0 text-border">{BREAKDOWN_LABEL[row.recurrence] ?? ''}</span>
						</div>
						<span class="ml-2 shrink-0 font-semibold text-expense tabular-nums"
							>{fmt(row.monthly)}/mo</span
						>
					</div>
				{/each}
				<div class="flex items-center justify-between border-t border-border pt-2 text-xs">
					<span class="font-semibold text-neutral">Total</span>
					<span class="font-semibold text-expense tabular-nums">{fmt(monthlyTotal)}/mo</span>
				</div>
			</div>
		{/if}
	</div>

	<div class="mb-3 px-4">
		<Tabs tabs={expenseTabs} active={activeTab} onchange={switchTab} />
	</div>

	{#if activeTab === 'recurring'}
		<div class="flex gap-2 overflow-x-auto px-4 pt-1 pb-2 [&::-webkit-scrollbar]:hidden">
			<button
				type="button"
				onclick={() => {
					sortBy = 'amount';
					sortDir = 'asc';
				}}
				class={pillClass(sortBy === 'amount' && sortDir === 'asc')}
			>
				Cheapest first
			</button>
			<button
				type="button"
				onclick={() => {
					sortBy = 'amount';
					sortDir = 'desc';
				}}
				class={pillClass(sortBy === 'amount' && sortDir === 'desc')}
			>
				Most expensive
			</button>
			<span class="self-center text-xs text-border">|</span>
			<button
				type="button"
				onclick={() => (filterStatus = 'all')}
				class={pillClass(filterStatus === 'all')}
			>
				All
			</button>
			<button
				type="button"
				onclick={() => (filterStatus = 'active')}
				class={pillClass(filterStatus === 'active')}
			>
				Active
			</button>
			<button
				type="button"
				onclick={() => (filterStatus = 'paused')}
				class={pillClass(filterStatus === 'paused')}
			>
				Paused
			</button>
		</div>
	{:else if activeTab === 'once'}
		<div class="flex gap-2 overflow-x-auto px-4 pt-1 pb-2 [&::-webkit-scrollbar]:hidden">
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
					sortDir = 'asc';
				}}
				class={pillClass(sortBy === 'amount' && sortDir === 'asc')}
			>
				Cheapest first
			</button>
			<button
				type="button"
				onclick={() => {
					sortBy = 'amount';
					sortDir = 'desc';
				}}
				class={pillClass(sortBy === 'amount' && sortDir === 'desc')}
			>
				Most expensive
			</button>
			{#if availableCategories.length > 1}
				<span class="self-center text-xs text-border">|</span>
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
	{:else if activeTab === 'past'}
		<div class="flex gap-2 overflow-x-auto px-4 pt-1 pb-2 [&::-webkit-scrollbar]:hidden">
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
	{/if}

	<div class="mt-1 px-4">
		{#if activeTab === 'recurring'}
			<div class="space-y-5">
				{#each recurringView as group (group.recurrence)}
					<div>
						<div class="mb-2 flex items-center justify-between">
							<p class="text-xs font-semibold tracking-widest text-neutral uppercase">
								{group.label}
							</p>
							{#if group.subtotal > 0}
								<div class="text-right">
									<p class="text-xs font-semibold text-expense tabular-nums">
										{fmt(group.subtotal)}
									</p>
									{#if group.recurrence !== 'monthly'}
										<p class="text-[10px] text-neutral tabular-nums">
											{fmt(group.monthlyEquiv)}/mo
										</p>
									{/if}
								</div>
							{/if}
						</div>
						<div class="space-y-2">
							{#each group.items as expense (expense.id)}
								<ExpenseRow {expense} onEdit={openEdit} />
							{/each}
						</div>
					</div>
				{/each}
			</div>
			{#if recurringView.length === 0}
				<div class="rounded-xl border border-dashed border-border p-8 text-center">
					<p class="text-sm text-neutral">No recurring expenses.</p>
				</div>
			{/if}
		{:else if activeTab === 'once'}
			<div class="space-y-2">
				{#each onceView as expense (expense.id)}
					<ExpenseRow {expense} once={true} onEdit={openEdit} />
				{/each}
			</div>
			{#if onceView.length === 0}
				<div class="rounded-xl border border-dashed border-border p-8 text-center">
					<p class="text-sm text-neutral">No upcoming one-time expenses.</p>
				</div>
			{/if}
		{:else if activeTab === 'past'}
			<div class="space-y-2">
				{#each pastView as expense (expense.id)}
					<ExpenseRow {expense} once={true} onEdit={openEdit} />
				{/each}
			</div>
			{#if pastView.length === 0}
				<div class="rounded-xl border border-dashed border-border p-8 text-center">
					<p class="text-sm text-neutral">Paid expenses will appear here.</p>
				</div>
			{/if}
		{/if}
	</div>
</div>

{#if showForm}
	<BottomSheet bind:open={showForm} title={editing ? 'Edit Expense' : 'New Expense'}>
		{#if confirmDelete}
			<div class="space-y-4 py-2">
				<div class="rounded-xl bg-surface-muted px-4 py-4 text-center">
					<p class="text-sm font-medium">Delete "{editing?.name}"?</p>
					<p class="mt-1 text-xs text-neutral">This can't be undone.</p>
				</div>
				<form
					method="POST"
					action="?/remove"
					use:enhance={() => {
						return async ({ update }) => {
							showForm = false;
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={editing?.id} />
					<button
						type="submit"
						class="w-full rounded-lg bg-expense py-3 text-sm font-semibold text-white"
					>
						Yes, delete
					</button>
				</form>
				<button
					type="button"
					onclick={() => (confirmDelete = false)}
					class="w-full rounded-lg py-3 text-sm font-semibold text-neutral"
				>
					Cancel
				</button>
			</div>
		{:else}
			<form
				method="POST"
				action="?/save"
				use:enhance={() => {
					return async ({ update }) => {
						showForm = false;
						await update();
					};
				}}
			>
				{#if editing}
					<input type="hidden" name="id" value={editing.id} />
				{/if}
				<input type="hidden" name="active" value={String(isOnce ? !form.paid : form.active)} />
				<input type="hidden" name="day_of_month" value={!isOnce ? form.day_of_month : ''} />
				<input type="hidden" name="due_date" value={isOnce ? form.due_date : ''} />
				<input type="hidden" name="starting_month" value={needsMonth ? form.starting_month : ''} />
				<div class="space-y-3">
					<div>
						<label for="exp-name" class="mb-1 block text-xs font-medium text-neutral">Name</label>
						<input
							id="exp-name"
							name="name"
							bind:value={form.name}
							class="input"
							placeholder="e.g. Netflix"
						/>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="exp-category" class="mb-1 block text-xs font-medium text-neutral"
								>Category</label
							>
							<select id="exp-category" name="category" bind:value={form.category} class="input">
								{#each categories as c (c)}<option value={c}>{c}</option>{/each}
							</select>
						</div>
						<div>
							<label for="exp-recurrence" class="mb-1 block text-xs font-medium text-neutral"
								>Recurrence</label
							>
							<select
								id="exp-recurrence"
								name="recurrence"
								bind:value={form.recurrence}
								class="input"
							>
								{#each recurrences as r (r)}<option value={r}>{r}</option>{/each}
							</select>
						</div>
					</div>
					<div>
						<label for="exp-amount" class="mb-1 block text-xs font-medium text-neutral"
							>Amount</label
						>
						<input
							id="exp-amount"
							name="amount"
							bind:value={form.amount}
							type="number"
							step="0.01"
							class="input"
							placeholder="0.00"
						/>
					</div>
					{#if isOnce}
						<div>
							<label for="exp-due" class="mb-1 block text-xs font-medium text-neutral"
								>Due date (optional)</label
							>
							<input id="exp-due" bind:value={form.due_date} type="date" class="input" />
						</div>
						<Toggle
							bind:checked={form.paid}
							label="Paid"
							id="exp-paid"
							color="var(--color-income)"
						/>
					{:else}
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="exp-dom" class="mb-1 block text-xs font-medium text-neutral"
									>Day of month</label
								>
								<select id="exp-dom" bind:value={form.day_of_month} class="input">
									<option value="">— select —</option>
									{#each Array.from({ length: 28 }, (_, i) => i + 1) as d (d)}
										<option value={String(d)}>{d}.</option>
									{/each}
									<option value="last_working">Last working day</option>
									<option value="second_last_working">2nd-last working day</option>
								</select>
							</div>
							{#if needsMonth}
								<div>
									<label for="exp-month" class="mb-1 block text-xs font-medium text-neutral"
										>Starting month</label
									>
									<select id="exp-month" bind:value={form.starting_month} class="input">
										<option value="">— select —</option>
										{#each months as m, i (m)}
											<option value={String(i + 1)}>{m}</option>
										{/each}
									</select>
								</div>
							{/if}
						</div>
						<Toggle
							bind:checked={form.active}
							label="Active"
							id="exp-active"
							color="var(--color-expense)"
						/>
					{/if}
				</div>
				<button
					type="submit"
					class="mt-5 w-full rounded-lg bg-expense py-3 text-sm font-semibold text-white"
				>
					{editing ? 'Save Changes' : 'Create Expense'}
				</button>
				{#if editing}
					<button
						type="button"
						onclick={() => (confirmDelete = true)}
						class="mt-2 w-full rounded-lg py-3 text-sm font-semibold text-expense"
					>
						Delete Expense
					</button>
				{/if}
			</form>
		{/if}
	</BottomSheet>
{/if}

<style>
	.input {
		width: 100%;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		padding: 0.5rem 0.75rem;
		font-size: 0.875rem;
		outline: none;
	}
	.input:focus {
		border-color: var(--color-expense);
	}
</style>
