<script lang="ts">
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import IncomeRow from '$lib/components/income/IncomeRow.svelte';
	import BottomSheet from '$lib/components/layout/BottomSheet.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { Plus } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	import type { Income } from '$lib/types';

	let { data } = $props();

	// ── Form state ───────────────────────────────────────────────────────────
	let showForm = $state(false);
	let editing = $state<Income | null>(null);
	let confirmDelete = $state(false);
	let form = $state({
		name: '',
		amount: '',
		recurrence: 'monthly',
		day_of_month: '',
		expected_date: '',
		starting_month: '',
		received: false
	});

	// ── Tab + sort state ──────────────────────────────────────────────────────
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

	const recurringIncome = $derived(data.incomeItems.filter((i: Income) => i.recurrence !== 'once'));
	const onceIncome = $derived(
		data.incomeItems.filter((i: Income) => i.recurrence === 'once' && !i.received)
	);
	const pastIncome = $derived(
		data.incomeItems.filter((i: Income) => i.recurrence === 'once' && i.received)
	);

	const monthlyTotal = $derived(
		recurringIncome
			.filter((i: Income) => i.recurrence === 'monthly')
			.reduce((s: number, i: Income) => s + i.amount, 0)
	);
	const receivedTotal = $derived(
		data.incomeItems
			.filter((i: Income) => i.received)
			.reduce((s: number, i: Income) => s + i.amount, 0)
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

	// ── Sort helpers ──────────────────────────────────────────────────────────
	function dateVal(s: string | null, dir: 'asc' | 'desc'): number {
		if (!s) return dir === 'asc' ? Infinity : -Infinity;
		return new Date(s).getTime();
	}

	function pillClass(isActive: boolean): string {
		return isActive
			? 'shrink-0 rounded-full border border-income bg-income/10 px-3 py-1.5 text-xs font-medium text-income transition-colors'
			: 'shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-neutral transition-colors hover:border-income/40';
	}

	// ── Derived views ─────────────────────────────────────────────────────────
	const recurringView = $derived.by(() => {
		const list = recurringIncome.slice() as Income[];
		if (sortBy === 'amount') {
			list.sort((a, b) => (sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount));
		}
		return list;
	});

	const onceView = $derived.by(() => {
		const list = onceIncome.slice() as Income[];
		if (sortBy === 'amount') {
			list.sort((a, b) => (sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount));
		} else {
			list.sort((a, b) => dateVal(a.expectedDate, sortDir) - dateVal(b.expectedDate, sortDir));
		}
		return list;
	});

	const pastView = $derived.by(() => {
		const list = pastIncome.slice() as Income[];
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

	// ── Form handlers ─────────────────────────────────────────────────────────
	function openNew() {
		editing = null;
		confirmDelete = false;
		form = {
			name: '',
			amount: '',
			recurrence: 'monthly',
			day_of_month: '',
			expected_date: '',
			starting_month: '',
			received: false
		};
		showForm = true;
	}

	function openEdit(income: Income) {
		editing = income;
		confirmDelete = false;
		form = {
			name: income.name,
			amount: String(income.amount),
			recurrence: income.recurrence,
			day_of_month: income.dayOfMonth ?? '',
			expected_date: income.expectedDate ?? '',
			starting_month: income.startingMonth ?? '',
			received: income.received
		};
		showForm = true;
	}
</script>

<div class="pb-6">
	<div class="px-4 pt-4">
		<PageHeader title="Income" user={data.user} displayName={data.settings.displayName}>
			{#snippet actions()}
				<button
					type="button"
					onclick={openNew}
					class="flex items-center gap-1 rounded-md bg-income px-3 py-1.5 text-xs font-medium text-white"
				>
					<Plus size={14} /> Add
				</button>
			{/snippet}
		</PageHeader>
	</div>

	<div class="mx-4 mb-4 grid grid-cols-2 gap-3">
		<div class="rounded-lg border border-border bg-surface px-4 py-3">
			<p class="text-xs text-neutral">Monthly expected</p>
			<p class="mt-0.5 text-sm font-semibold text-income tabular-nums">
				{fmt(monthlyTotal)}
			</p>
		</div>
		<div class="rounded-lg border border-border bg-surface px-4 py-3">
			<p class="text-xs text-neutral">Received</p>
			<p class="mt-0.5 text-sm font-semibold text-income tabular-nums">
				{fmt(receivedTotal)}
			</p>
		</div>
	</div>

	<div class="mb-3 px-4">
		<Tabs tabs={incomeTabs} active={activeTab} onchange={switchTab} />
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
				Highest first
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
				Highest first
			</button>
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

	<div class="mt-1 space-y-2 px-4">
		{#if activeTab === 'recurring'}
			{#each recurringView as income (income.id)}
				<IncomeRow {income} onEdit={openEdit} />
			{/each}
			{#if recurringView.length === 0}
				<div class="rounded-xl border border-dashed border-border p-8 text-center">
					<p class="text-sm text-neutral">No recurring income.</p>
				</div>
			{/if}
		{:else if activeTab === 'once'}
			{#each onceView as income (income.id)}
				<IncomeRow {income} once={true} onEdit={openEdit} />
			{/each}
			{#if onceView.length === 0}
				<div class="rounded-xl border border-dashed border-border p-8 text-center">
					<p class="text-sm text-neutral">No upcoming one-time income.</p>
				</div>
			{/if}
		{:else if activeTab === 'past'}
			{#each pastView as income (income.id)}
				<IncomeRow {income} once={true} onEdit={openEdit} />
			{/each}
			{#if pastView.length === 0}
				<div class="rounded-xl border border-dashed border-border p-8 text-center">
					<p class="text-sm text-neutral">Received income will appear here.</p>
				</div>
			{/if}
		{/if}
	</div>
</div>

{#if showForm}
	<BottomSheet bind:open={showForm} title={editing ? 'Edit Income' : 'New Income'}>
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
						class="w-full rounded-lg bg-income py-3 text-sm font-semibold text-white"
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
				<input type="hidden" name="received" value={String(form.received)} />
				<input type="hidden" name="day_of_month" value={!isOnce ? form.day_of_month : ''} />
				<input type="hidden" name="expected_date" value={isOnce ? form.expected_date : ''} />
				<input type="hidden" name="starting_month" value={needsMonth ? form.starting_month : ''} />
				<div class="space-y-3">
					<div>
						<label for="inc-name" class="mb-1 block text-xs font-medium text-neutral">Name</label>
						<input
							id="inc-name"
							name="name"
							bind:value={form.name}
							class="input"
							placeholder="e.g. Salary"
						/>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="inc-amount" class="mb-1 block text-xs font-medium text-neutral"
								>Amount</label
							>
							<input
								id="inc-amount"
								name="amount"
								bind:value={form.amount}
								type="number"
								step="0.01"
								class="input"
								placeholder="0.00"
							/>
						</div>
						<div>
							<label for="inc-recurrence" class="mb-1 block text-xs font-medium text-neutral"
								>Recurrence</label
							>
							<select
								id="inc-recurrence"
								name="recurrence"
								bind:value={form.recurrence}
								class="input"
							>
								{#each recurrences as r (r)}<option value={r}>{r}</option>{/each}
							</select>
						</div>
					</div>
					{#if isOnce}
						<div>
							<label for="inc-exp-date" class="mb-1 block text-xs font-medium text-neutral"
								>Expected date (optional)</label
							>
							<input id="inc-exp-date" bind:value={form.expected_date} type="date" class="input" />
						</div>
					{:else}
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="inc-dom" class="mb-1 block text-xs font-medium text-neutral"
									>Day of month</label
								>
								<select id="inc-dom" bind:value={form.day_of_month} class="input">
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
									<label for="inc-month" class="mb-1 block text-xs font-medium text-neutral"
										>Starting month</label
									>
									<select id="inc-month" bind:value={form.starting_month} class="input">
										<option value="">— select —</option>
										{#each months as m, i (m)}
											<option value={String(i + 1)}>{m}</option>
										{/each}
									</select>
								</div>
							{/if}
						</div>
					{/if}
					<Toggle
						bind:checked={form.received}
						label="Already received"
						id="inc-received"
						color="var(--color-income)"
					/>
				</div>
				<button
					type="submit"
					class="mt-5 w-full rounded-lg bg-income py-3 text-sm font-semibold text-white"
				>
					{editing ? 'Save Changes' : 'Create Income'}
				</button>
				{#if editing}
					<button
						type="button"
						onclick={() => (confirmDelete = true)}
						class="mt-2 w-full rounded-lg py-3 text-sm font-semibold text-income"
					>
						Delete Income
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
		border-color: var(--color-income);
	}
</style>
