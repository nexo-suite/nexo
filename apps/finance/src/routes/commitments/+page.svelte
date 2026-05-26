<script lang="ts">
	import { BottomSheet, PageHeader } from '@nexo/ui';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import { Plus, ChevronRight, ArrowUpRight, ArrowDownLeft } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { formatCurrency, getIntlLocale } from '$lib/utils';
	import { m } from '$lib/paraglide/messages.js';
	import type { Account, Expense, Debt } from '$lib/types';

	let { data } = $props();

	const fmt = (n: number) => formatCurrency(n, data.settings.currency, data.settings.hideCents);

	// ── Expense form ──────────────────────────────────────────────────────────
	let showExpenseForm = $state(false);
	let editingExpense = $state<Expense | null>(null);
	let confirmDeleteExpense = $state(false);
	let expenseForm = $state<{
		name: string;
		amount: number | null;
		due_date: string;
		account_id: string;
		notes: string;
	}>({
		name: '',
		amount: null,
		due_date: '',
		account_id: '',
		notes: ''
	});

	function openNewExpense() {
		editingExpense = null;
		confirmDeleteExpense = false;
		expenseForm = {
			name: '',
			amount: null,
			due_date: '',
			account_id: data.settings?.defaultAccountId ?? '',
			notes: ''
		};
		showExpenseForm = true;
	}

	function openEditExpense(expense: Expense) {
		editingExpense = expense;
		confirmDeleteExpense = false;
		expenseForm = {
			name: expense.name,
			amount: expense.amount,
			due_date: expense.dueDate ?? '',
			account_id: expense.accountId ?? '',
			notes: expense.notes ?? ''
		};
		showExpenseForm = true;
	}

	// ── Debt form ─────────────────────────────────────────────────────────────
	let showDebtForm = $state(false);
	let editingDebt = $state<Debt | null>(null);
	let confirmDeleteDebt = $state(false);
	let debtForm = $state<{
		direction: string;
		counterparty: string;
		amount: number | null;
		due_date: string;
		account_id: string;
		notes: string;
	}>({
		direction: 'owe',
		counterparty: '',
		amount: null,
		due_date: '',
		account_id: '',
		notes: ''
	});

	function openNewDebt() {
		editingDebt = null;
		confirmDeleteDebt = false;
		debtForm = {
			direction: 'owe',
			counterparty: '',
			amount: null,
			due_date: '',
			account_id: data.settings?.defaultAccountId ?? '',
			notes: ''
		};
		showDebtForm = true;
	}

	function openEditDebt(debt: Debt) {
		editingDebt = debt;
		confirmDeleteDebt = false;
		debtForm = {
			direction: debt.direction,
			counterparty: debt.counterparty,
			amount: debt.amount,
			due_date: debt.dueDate ?? '',
			account_id: (debt as Debt & { accountId?: string | null }).accountId ?? '',
			notes: debt.notes ?? ''
		};
		showDebtForm = true;
	}

	// ── Derived ───────────────────────────────────────────────────────────────
	const accountMap = $derived(new Map(data.accounts.map((a: Account) => [a.id, a])));

	const totalCommitted = $derived(
		data.expenses.reduce((s: number, e: Expense) => s + e.amount, 0) +
			data.debts
				.filter((d: Debt) => d.direction === 'owe')
				.reduce((s: number, d: Debt) => s + d.amount, 0)
	);

	const unallocatedExpenses = $derived(data.expenses.filter((e: Expense) => !e.accountId));
	const unallocatedDebts = $derived(
		data.debts.filter((d: Debt) => !(d as Debt & { accountId?: string | null }).accountId)
	);
</script>

<div class="page">
	<PageHeader title={m.commitments_title()} subtitle={m.commitments_subtitle()}>
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
	</PageHeader>

	<!-- Total committed card -->
	{#if totalCommitted > 0}
		<div
			class="mb-3.5 rounded-[var(--radius-lg)] p-3.5"
			style="background: var(--expense-soft); border: 1px solid color-mix(in oklab, var(--color-expense) 25%, var(--color-border-default));"
		>
			<div class="t-label" style="color: var(--expense-ink);">{m.commitments_total_committed()}</div>
			<div
				class="mt-1.5 font-mono text-[22px] font-semibold tracking-tight"
				style="color: var(--expense-ink); font-variant-numeric: tabular-nums;"
			>
				{fmt(totalCommitted)}
			</div>
		</div>
	{/if}

	<!-- Fund allocation per account -->
	{#if data.accounts.length > 0}
		<div class="mb-4">
			<div class="t-label text-text-subtle mb-2 px-0.5">{m.commitments_fund_allocation()}</div>
			<div
				class="border-border-default bg-surface-1 overflow-hidden rounded-[var(--radius-xl)] border"
			>
				{#each data.accounts as account, i (account.id)}
					{@const em = data.earmarks[account.id] ?? { earmarked: 0, available: account.balance }}
					<div class="px-3.5 py-3" class:border-t={i > 0} class:border-border-subtle={i > 0}>
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2.5">
								<div
									class="bg-bg-1 grid size-7 place-items-center rounded-[var(--radius-sm)] text-[13px]"
								>
									{account.emoji ?? '🏦'}
								</div>
								<span class="text-text-primary text-[14px] font-medium">{account.name}</span>
							</div>
							<span
								class="text-text-muted font-mono text-[13px]"
								style="font-variant-numeric: tabular-nums;"
							>
								{fmt(account.balance)}
							</span>
						</div>
						{#if em.earmarked > 0}
							<div class="mt-2.5 pl-[38px]">
								<div class="flex justify-between text-[12px]">
									<span class="text-text-subtle">{m.commitments_earmarked()}</span>
									<span
										class="font-mono font-medium"
										style="color: var(--expense-ink); font-variant-numeric: tabular-nums;"
									>
										{fmt(em.earmarked)}
									</span>
								</div>
								<div class="mt-0.5 flex justify-between text-[12px]">
									<span class="text-text-subtle">{m.commitments_available()}</span>
									<span
										class="font-mono font-semibold"
										style="color: {em.available < 0
											? 'var(--expense-ink)'
											: 'var(--income-ink)'}; font-variant-numeric: tabular-nums;"
									>
										{fmt(em.available)}
									</span>
								</div>
								<div class="bg-bg-1 mt-2 h-[5px] overflow-hidden rounded-full">
									<div
										class="h-full rounded-full transition-all"
										style="width: {Math.min(
											100,
											(em.earmarked / account.balance) * 100
										)}%; background: {em.available < 0
											? 'var(--color-expense)'
											: 'var(--color-accent)'};"
									></div>
								</div>
							</div>
						{:else}
							<div class="text-text-faint mt-1 pl-[38px] text-[11px]">{m.commitments_nothing_earmarked()}</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Upcoming Expenses -->
	<div class="mb-4">
		<div class="mb-2 flex items-center justify-between px-0.5">
			<div class="t-label text-text-subtle">{m.commitments_upcoming_expenses()}</div>
			<button
				type="button"
				onclick={openNewExpense}
				class="border-border-default bg-surface-1 text-text-muted active:bg-bg-1 grid size-[30px] place-items-center rounded-full border transition-colors"
				aria-label={m.commitments_add_expense_aria()}
			>
				<Plus size={14} strokeWidth={1.8} />
			</button>
		</div>

		{#if data.expenses.length === 0}
			<div
				class="border-border-default bg-surface-1 text-text-subtle rounded-[var(--radius-xl)] border border-dashed p-7 text-center text-[13.5px]"
			>
				{m.commitments_no_upcoming_expenses()}
			</div>
		{:else}
			<div
				class="border-border-default bg-surface-1 overflow-hidden rounded-[var(--radius-xl)] border"
			>
				{#each data.expenses as expense, i (expense.id)}
					{@const acc = expense.accountId ? accountMap.get(expense.accountId) : null}
					<button
						type="button"
						onclick={() => openEditExpense(expense)}
						class="active:bg-surface-2 flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors"
						class:border-t={i > 0}
						class:border-border-subtle={i > 0}
					>
						<div
							class="grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)] text-[11px] font-bold"
							style="background: var(--expense-soft); color: var(--expense-ink);"
						>
							{expense.category.slice(0, 3).toUpperCase()}
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-text-primary truncate text-[14px] font-medium">{expense.name}</div>
							<div class="text-text-subtle mt-0.5 text-[11px]">
								{#if expense.dueDate}
									{m.commitments_due_label({ date: new Date(expense.dueDate).toLocaleDateString(getIntlLocale(), { day: 'numeric', month: 'short' }) })}
								{:else}
									{m.commitments_no_due_date()}
								{/if}
								{#if acc}
									· <span class="font-medium">{acc.name}</span>
								{/if}
							</div>
						</div>
						<div class="flex items-center gap-1">
							<span
								class="font-mono text-[14px] font-semibold"
								style="color: var(--expense-ink); font-variant-numeric: tabular-nums;"
							>
								{fmt(expense.amount)}
							</span>
							<ChevronRight size={13} class="text-text-faint" />
						</div>
					</button>
				{/each}
			</div>
			{#if unallocatedExpenses.length > 0}
				<p class="text-text-faint mt-1.5 px-0.5 text-[11px]">
					{unallocatedExpenses.length === 1
						? m.commitments_unallocated_expenses_one({ count: unallocatedExpenses.length })
						: m.commitments_unallocated_expenses_other({ count: unallocatedExpenses.length })}
				</p>
			{/if}
		{/if}
	</div>

	<!-- Open Debts -->
	<div class="mb-4">
		<div class="mb-2 flex items-center justify-between px-0.5">
			<div class="t-label text-text-subtle">{m.commitments_open_debts()}</div>
			<button
				type="button"
				onclick={openNewDebt}
				class="border-border-default bg-surface-1 text-text-muted active:bg-bg-1 grid size-[30px] place-items-center rounded-full border transition-colors"
				aria-label={m.commitments_add_debt_aria()}
			>
				<Plus size={14} strokeWidth={1.8} />
			</button>
		</div>

		{#if data.debts.length === 0}
			<div
				class="border-border-default bg-surface-1 text-text-subtle rounded-[var(--radius-xl)] border border-dashed p-7 text-center text-[13.5px]"
			>
				{m.commitments_no_open_debts()}
			</div>
		{:else}
			<div
				class="border-border-default bg-surface-1 overflow-hidden rounded-[var(--radius-xl)] border"
			>
				{#each data.debts as debt, i (debt.id)}
					{@const debtWithAcc = debt as Debt & { accountId?: string | null }}
					{@const acc = debtWithAcc.accountId ? accountMap.get(debtWithAcc.accountId) : null}
					<button
						type="button"
						onclick={() => openEditDebt(debt)}
						class="active:bg-surface-2 flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors"
						class:border-t={i > 0}
						class:border-border-subtle={i > 0}
					>
						<div
							class="grid size-8 shrink-0 place-items-center rounded-[var(--radius-md)]"
							style="background: var(--debt-soft); color: var(--debt-ink);"
						>
							{#if debt.direction === 'owe'}
								<ArrowUpRight size={15} strokeWidth={2} />
							{:else}
								<ArrowDownLeft size={15} strokeWidth={2} />
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<div class="text-text-primary truncate text-[14px] font-medium">
								{debt.counterparty}
							</div>
							<div class="text-text-subtle mt-0.5 text-[11px]">
								{debt.direction === 'owe' ? m.debt_i_owe() : m.debt_owed_to_me()}
								{#if debt.dueDate}
									· {m.expenses_due_on({ date: new Date(debt.dueDate).toLocaleDateString(getIntlLocale(), { day: 'numeric', month: 'short' }) })}
								{/if}
								{#if acc}
									· <span class="font-medium">{acc.name}</span>
								{/if}
							</div>
						</div>
						<div class="flex items-center gap-1">
							<span
								class="font-mono text-[14px] font-semibold"
								style="color: var(--debt-ink); font-variant-numeric: tabular-nums;"
							>
								{fmt(debt.amount)}
							</span>
							<ChevronRight size={13} class="text-text-faint" />
						</div>
					</button>
				{/each}
			</div>
			{#if unallocatedDebts.length > 0}
				<p class="text-text-faint mt-1.5 px-0.5 text-[11px]">
					{unallocatedDebts.length === 1
						? m.commitments_unallocated_debts_one({ count: unallocatedDebts.length })
						: m.commitments_unallocated_debts_other({ count: unallocatedDebts.length })}
				</p>
			{/if}
		{/if}
	</div>
</div>

<!-- Expense form sheet -->
{#if showExpenseForm}
	<BottomSheet bind:open={showExpenseForm} title={editingExpense ? m.commitments_expense_form_edit() : m.commitments_expense_form_new()}>
		{#if confirmDeleteExpense}
			<div class="space-y-4 py-2">
				<div class="bg-bg-1 rounded-[var(--radius-lg)] px-4 py-4 text-center">
					<p class="text-text-primary text-[14px] font-medium">{m.commitments_delete_expense_confirm({ name: editingExpense?.name ?? '' })}</p>
					<p class="text-text-subtle mt-1 text-[12px]">{m.common_undone_warning()}</p>
				</div>
				<form
					method="POST"
					action="?/removeExpense"
					use:enhance={() => {
						return async ({ update }) => {
							showExpenseForm = false;
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={editingExpense?.id} />
					<button
						type="submit"
						class="w-full rounded-[var(--radius-md)] py-3 text-[14px] font-semibold text-white"
						style="background: var(--color-expense);"
					>
						{m.common_yes_delete()}
					</button>
				</form>
				<button
					type="button"
					onclick={() => (confirmDeleteExpense = false)}
					class="text-text-subtle w-full rounded-[var(--radius-md)] py-3 text-[14px] font-semibold"
				>
					{m.common_cancel()}
				</button>
			</div>
		{:else}
			<form
				method="POST"
				action="?/saveExpense"
				use:enhance={() => {
					return async ({ update }) => {
						showExpenseForm = false;
						await update();
					};
				}}
			>
				{#if editingExpense}
					<input type="hidden" name="id" value={editingExpense.id} />
				{/if}
				<div class="space-y-3">
					<div>
						<label for="exp-name" class="t-label text-text-subtle mb-1 block">{m.commitments_form_label_name()}</label>
						<input
							id="exp-name"
							name="name"
							bind:value={expenseForm.name}
							class="input"
							placeholder={m.commitments_form_name_placeholder()}
						/>
					</div>
					<div>
						<label for="exp-amount" class="t-label text-text-subtle mb-1 block">{m.commitments_form_label_amount()}</label>
						<input
							id="exp-amount"
							name="amount"
							bind:value={expenseForm.amount}
							type="number"
							step="0.01"
							class="input"
							placeholder="0.00"
						/>
					</div>
					<div>
						<label for="exp-due" class="t-label text-text-subtle mb-1 block"
							>{m.commitments_form_label_due()}</label
						>
						<input
							id="exp-due"
							name="due_date"
							bind:value={expenseForm.due_date}
							type="date"
							class="input"
						/>
					</div>
					<div>
						<label for="exp-account" class="t-label text-text-subtle mb-1 block"
							>{m.commitments_form_label_account()}</label
						>
						<select
							id="exp-account"
							name="account_id"
							bind:value={expenseForm.account_id}
							class="input"
						>
							<option value="">{m.common_unallocated()}</option>
							{#each data.accounts as acc (acc.id)}
								<option value={acc.id}>{acc.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="exp-notes" class="t-label text-text-subtle mb-1 block"
							>{m.commitments_form_label_notes()}</label
						>
						<input
							id="exp-notes"
							name="notes"
							bind:value={expenseForm.notes}
							class="input"
							placeholder={m.commitments_form_notes_placeholder_expense()}
						/>
					</div>
				</div>
				<button
					type="submit"
					class="bg-text-primary text-bg-0 mt-5 h-12 w-full rounded-[var(--radius-md)] text-[14px] font-semibold"
				>
					{editingExpense ? m.commitments_form_save_expense() : m.commitments_form_create_expense()}
				</button>
				{#if editingExpense}
					<button
						type="button"
						onclick={() => (confirmDeleteExpense = true)}
						class="mt-2 w-full rounded-[var(--radius-md)] py-3 text-[14px] font-semibold"
						style="color: var(--expense-ink);"
					>
						{m.commitments_form_delete_expense()}
					</button>
				{/if}
			</form>
		{/if}
	</BottomSheet>
{/if}

<!-- Debt form sheet -->
{#if showDebtForm}
	<BottomSheet bind:open={showDebtForm} title={editingDebt ? m.commitments_debt_form_edit() : m.commitments_debt_form_new()}>
		{#if confirmDeleteDebt}
			<div class="space-y-4 py-2">
				<div class="bg-bg-1 rounded-[var(--radius-lg)] px-4 py-4 text-center">
					<p class="text-text-primary text-[14px] font-medium">
						{m.commitments_delete_debt_confirm({ name: editingDebt?.counterparty ?? '' })}
					</p>
					<p class="text-text-subtle mt-1 text-[12px]">{m.common_undone_warning()}</p>
				</div>
				<form
					method="POST"
					action="?/removeDebt"
					use:enhance={() => {
						return async ({ update }) => {
							showDebtForm = false;
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={editingDebt?.id} />
					<button
						type="submit"
						class="w-full rounded-[var(--radius-md)] py-3 text-[14px] font-semibold text-white"
						style="background: var(--color-debt);"
					>
						{m.common_yes_delete()}
					</button>
				</form>
				<button
					type="button"
					onclick={() => (confirmDeleteDebt = false)}
					class="text-text-subtle w-full rounded-[var(--radius-md)] py-3 text-[14px] font-semibold"
				>
					{m.common_cancel()}
				</button>
			</div>
		{:else}
			<form
				method="POST"
				action="?/saveDebt"
				use:enhance={() => {
					return async ({ update }) => {
						showDebtForm = false;
						await update();
					};
				}}
			>
				{#if editingDebt}
					<input type="hidden" name="id" value={editingDebt.id} />
				{/if}
				<div class="space-y-3">
					<div>
						<label for="dbt-direction" class="t-label text-text-subtle mb-1 block">{m.commitments_form_label_direction()}</label>
						<select
							id="dbt-direction"
							name="direction"
							bind:value={debtForm.direction}
							class="input"
						>
							<option value="owe">{m.commitments_form_direction_owe()}</option>
							<option value="owed">{m.commitments_form_direction_owed()}</option>
						</select>
					</div>
					<div>
						<label for="dbt-counterparty" class="t-label text-text-subtle mb-1 block"
							>{m.commitments_form_label_counterparty()}</label
						>
						<input
							id="dbt-counterparty"
							name="counterparty"
							bind:value={debtForm.counterparty}
							class="input"
							placeholder={m.commitments_form_counterparty_placeholder()}
						/>
					</div>
					<div>
						<label for="dbt-amount" class="t-label text-text-subtle mb-1 block">{m.commitments_form_label_amount()}</label>
						<input
							id="dbt-amount"
							name="amount"
							bind:value={debtForm.amount}
							type="number"
							step="0.01"
							class="input"
							placeholder="0.00"
						/>
					</div>
					<div>
						<label for="dbt-due" class="t-label text-text-subtle mb-1 block"
							>{m.commitments_form_label_due()}</label
						>
						<input
							id="dbt-due"
							name="due_date"
							bind:value={debtForm.due_date}
							type="date"
							class="input"
						/>
					</div>
					<div>
						<label for="dbt-account" class="t-label text-text-subtle mb-1 block"
							>{m.commitments_form_label_account()}</label
						>
						<select
							id="dbt-account"
							name="account_id"
							bind:value={debtForm.account_id}
							class="input"
						>
							<option value="">{m.common_unallocated()}</option>
							{#each data.accounts as acc (acc.id)}
								<option value={acc.id}>{acc.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="dbt-notes" class="t-label text-text-subtle mb-1 block"
							>{m.commitments_form_label_notes()}</label
						>
						<input
							id="dbt-notes"
							name="notes"
							bind:value={debtForm.notes}
							class="input"
							placeholder={m.commitments_form_notes_placeholder_debt()}
						/>
					</div>
				</div>
				<button
					type="submit"
					class="bg-text-primary text-bg-0 mt-5 h-12 w-full rounded-[var(--radius-md)] text-[14px] font-semibold"
				>
					{editingDebt ? m.commitments_form_save_debt() : m.commitments_form_create_debt()}
				</button>
				{#if editingDebt}
					<div class="mt-2 grid grid-cols-2 gap-2">
						<button
							type="submit"
							form="mark-debt-paid-form"
							class="h-12 rounded-[var(--radius-md)] text-[14px] font-semibold text-white"
							style="background: var(--color-income);"
						>
							{m.commitments_form_mark_paid()}
						</button>
						<button
							type="button"
							onclick={() => (confirmDeleteDebt = true)}
							class="h-12 rounded-[var(--radius-md)] text-[14px] font-semibold"
							style="color: var(--expense-ink);"
						>
							{m.common_delete()}
						</button>
					</div>
				{/if}
			</form>
		{/if}
	</BottomSheet>
{/if}

<!-- Hidden form for markDebtPaid -->
<form
	id="mark-debt-paid-form"
	method="POST"
	action="?/markDebtPaid"
	class="hidden"
	use:enhance={() => {
		return async ({ update }) => {
			showDebtForm = false;
			await update();
		};
	}}
>
	<input type="hidden" name="id" value={editingDebt?.id} />
</form>

<style>
	.input {
		width: 100%;
		height: 44px;
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-md);
		background: var(--color-bg-1);
		padding: 0 0.875rem;
		font-size: 0.875rem;
		color: var(--color-text-primary);
		outline: none;
	}
	.input:focus {
		border-color: var(--color-text-primary);
	}
</style>
