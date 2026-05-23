<script lang="ts">
	import { BottomSheet, PageHeader, ToggleRow } from '@nexo/ui';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import { Plus, Check, ChevronRight } from '@lucide/svelte';
	import { enhance } from '$app/forms';

	import type { Debt } from '$lib/types';
	import { getIntlLocale } from '$lib/utils';

	let { data } = $props();

	let showForm = $state(false);
	let editing = $state<Debt | null>(null);
	let confirmDelete = $state(false);
	let confirmClear = $state(false);
	let form = $state({
		direction: 'owe',
		counterparty: '',
		amount: '',
		due_date: '',
		account_id: '',
		paid: false,
		notes: ''
	});

	const fmt = (n: number) =>
		new Intl.NumberFormat(getIntlLocale(), {
			style: 'currency',
			currency: data.settings?.currency ?? 'EUR',
			minimumFractionDigits: data.settings?.hideCents ? 0 : 2,
			maximumFractionDigits: data.settings?.hideCents ? 0 : 2
		}).format(n);

	const fmtDate = (d: string) =>
		new Date(d).toLocaleDateString(getIntlLocale(), {
			day: 'numeric',
			month: 'short',
			year: '2-digit'
		});

	function initials(name: string): string {
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
		return name.slice(0, 2).toUpperCase();
	}

	const totalOwe = $derived(
		data.debts
			.filter((d: Debt) => d.direction === 'owe' && !d.paid)
			.reduce((s: number, d: Debt) => s + d.amount, 0)
	);
	const totalOwed = $derived(
		data.debts
			.filter((d: Debt) => d.direction === 'owed' && !d.paid)
			.reduce((s: number, d: Debt) => s + d.amount, 0)
	);
	const iOwe = $derived(data.debts.filter((d: Debt) => d.direction === 'owe' && !d.paid));
	const owedToMe = $derived(data.debts.filter((d: Debt) => d.direction === 'owed' && !d.paid));
	const settled = $derived(data.debts.filter((d: Debt) => d.paid));

	function openNew() {
		editing = null;
		confirmDelete = false;
		form = {
			direction: 'owe',
			counterparty: '',
			amount: '',
			due_date: '',
			account_id: data.settings?.defaultAccountId ?? '',
			paid: false,
			notes: ''
		};
		showForm = true;
	}

	function openEdit(debt: Debt) {
		editing = debt;
		confirmDelete = false;
		form = {
			direction: debt.direction,
			counterparty: debt.counterparty,
			amount: String(debt.amount),
			due_date: debt.dueDate ?? '',
			account_id: debt.accountId ?? '',
			paid: debt.paid,
			notes: debt.notes ?? ''
		};
		showForm = true;
	}
</script>

<div class="page">
	<PageHeader title="Debt" subtitle="Money in motion between friends.">
		{#snippet actions()}
			<button
				type="button"
				onclick={openNew}
				aria-label="Add debt"
				class="bg-text-primary text-bg-0 flex h-[38px] w-[38px] items-center justify-center rounded-full"
			>
				<Plus size={18} stroke-width={2.5} />
			</button>
		{/snippet}
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
	</PageHeader>

	<!-- Totals grid -->
	<div class="mb-6 grid grid-cols-2 gap-3">
		<div
			class="rounded-[var(--radius-lg)] border px-4 py-3"
			style="background: var(--debt-soft); border-color: color-mix(in oklab, var(--color-debt) 25%, var(--color-border-default));"
		>
			<p class="t-label" style="color: var(--debt-ink);">I owe</p>
			<p
				class="mono mt-1.5 text-[22px] leading-tight font-semibold"
				style="color: var(--debt-ink);"
			>
				{fmt(totalOwe)}
			</p>
		</div>
		<div
			class="rounded-[var(--radius-lg)] border px-4 py-3"
			style="background: var(--income-soft); border-color: color-mix(in oklab, var(--color-income) 25%, var(--color-border-default));"
		>
			<p class="t-label" style="color: var(--income-ink);">Owed to me</p>
			<p
				class="mono mt-1.5 text-[22px] leading-tight font-semibold"
				style="color: var(--income-ink);"
			>
				{fmt(totalOwed)}
			</p>
		</div>
	</div>

	<!-- I owe section -->
	{#if iOwe.length > 0}
		<p class="t-label mb-1" style="color: var(--debt-ink);">I owe</p>
		{#each iOwe as debt (debt.id)}
			<div
				class="border-border-default bg-surface-1 mt-[10px] rounded-[var(--radius-lg)] border px-4 py-[14px]"
			>
				<!-- Row 1: avatar + name + amount -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2.5">
						<div
							class="bg-bg-2 text-text-muted flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
						>
							{initials(debt.counterparty)}
						</div>
						<span class="text-text-primary text-[15px] font-medium">{debt.counterparty}</span>
					</div>
					<span class="mono text-[17px] font-semibold" style="color: var(--debt-ink);">
						{fmt(debt.amount)}
					</span>
				</div>

				<!-- Meta row -->
				{#if debt.dueDate || debt.notes}
					<div class="mt-1.5 flex items-center gap-1 pl-[36px]">
						{#if debt.dueDate}
							<span class="mono text-text-faint text-[12px]">{fmtDate(debt.dueDate)}</span>
						{/if}
						{#if debt.dueDate && debt.notes}
							<span class="text-text-faint text-[12px]">&middot;</span>
						{/if}
						{#if debt.notes}
							<span class="text-text-subtle truncate text-[12px]">{debt.notes}</span>
						{/if}
					</div>
				{/if}

				<!-- Actions -->
				<div class="mt-3 flex items-center gap-2 pl-[36px]">
					<form
						method="POST"
						action="?/save"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
							};
						}}
					>
						<input type="hidden" name="id" value={debt.id} />
						<input type="hidden" name="direction" value={debt.direction} />
						<input type="hidden" name="counterparty" value={debt.counterparty} />
						<input type="hidden" name="amount" value={String(debt.amount)} />
						<input type="hidden" name="due_date" value={debt.dueDate ?? ''} />
						<input type="hidden" name="account_id" value={debt.accountId ?? ''} />
						<input type="hidden" name="notes" value={debt.notes ?? ''} />
						<input type="hidden" name="paid" value="true" />
						<button
							type="submit"
							class="bg-text-primary text-bg-0 rounded-[var(--radius-sm)] px-3 py-1.5 text-[12px] font-medium"
						>
							Mark settled
						</button>
					</form>
					<button
						type="button"
						onclick={() => openEdit(debt)}
						class="border-border-default text-text-muted rounded-[var(--radius-sm)] border px-3 py-1.5 text-[12px] font-medium"
					>
						Edit
					</button>
				</div>
			</div>
		{/each}
	{/if}

	<!-- Owed to me section -->
	{#if owedToMe.length > 0}
		<p class="t-label mb-1 {iOwe.length > 0 ? 'mt-6' : ''}" style="color: var(--income-ink);">
			Owed to me
		</p>
		{#each owedToMe as debt (debt.id)}
			<div
				class="border-border-default bg-surface-1 mt-[10px] rounded-[var(--radius-lg)] border px-4 py-[14px]"
			>
				<!-- Row 1: avatar + name + amount -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2.5">
						<div
							class="bg-bg-2 text-text-muted flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
						>
							{initials(debt.counterparty)}
						</div>
						<span class="text-text-primary text-[15px] font-medium">{debt.counterparty}</span>
					</div>
					<span class="mono text-[17px] font-semibold" style="color: var(--income-ink);">
						{fmt(debt.amount)}
					</span>
				</div>

				<!-- Meta row -->
				{#if debt.dueDate || debt.notes}
					<div class="mt-1.5 flex items-center gap-1 pl-[36px]">
						{#if debt.dueDate}
							<span class="mono text-text-faint text-[12px]">{fmtDate(debt.dueDate)}</span>
						{/if}
						{#if debt.dueDate && debt.notes}
							<span class="text-text-faint text-[12px]">&middot;</span>
						{/if}
						{#if debt.notes}
							<span class="text-text-subtle truncate text-[12px]">{debt.notes}</span>
						{/if}
					</div>
				{/if}

				<!-- Actions -->
				<div class="mt-3 flex items-center gap-2 pl-[36px]">
					<form
						method="POST"
						action="?/save"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
							};
						}}
					>
						<input type="hidden" name="id" value={debt.id} />
						<input type="hidden" name="direction" value={debt.direction} />
						<input type="hidden" name="counterparty" value={debt.counterparty} />
						<input type="hidden" name="amount" value={String(debt.amount)} />
						<input type="hidden" name="due_date" value={debt.dueDate ?? ''} />
						<input type="hidden" name="account_id" value={debt.accountId ?? ''} />
						<input type="hidden" name="notes" value={debt.notes ?? ''} />
						<input type="hidden" name="paid" value="true" />
						<button
							type="submit"
							class="bg-text-primary text-bg-0 rounded-[var(--radius-sm)] px-3 py-1.5 text-[12px] font-medium"
						>
							Mark settled
						</button>
					</form>
					<button
						type="button"
						onclick={() => openEdit(debt)}
						class="border-border-default text-text-muted rounded-[var(--radius-sm)] border px-3 py-1.5 text-[12px] font-medium"
					>
						Edit
					</button>
				</div>
			</div>
		{/each}
	{/if}

	<!-- Empty state -->
	{#if data.debts.length === 0}
		<div
			class="border-border-default rounded-[var(--radius-lg)] border border-dashed p-8 text-center"
		>
			<p class="text-text-subtle text-[14px]">No debts tracked. Tap + to create one.</p>
		</div>
	{/if}

	<!-- Settled section -->
	{#if settled.length > 0}
		<details class="mt-6">
			<summary
				class="text-text-subtle flex cursor-pointer list-none items-center gap-1.5 text-[12px] font-medium [&::-webkit-details-marker]:hidden"
			>
				<ChevronRight size={14} class="transition-transform duration-200 [[open]>&]:rotate-90" />
				Settled &middot; {settled.length}
			</summary>
			<div class="mt-3 space-y-0">
				{#each settled as debt (debt.id)}
					<div class="border-border-subtle flex items-center gap-3 border-b py-2.5 last:border-b-0">
						<Check size={14} class="text-text-faint shrink-0" />
						<div class="min-w-0 flex-1">
							<span class="text-text-muted text-[13px] font-medium">{debt.counterparty}</span>
						</div>
						<span class="mono text-text-faint text-[12px]">
							{#if debt.dueDate}Settled {fmtDate(debt.dueDate)} &middot;
							{/if}{fmt(debt.amount)}
						</span>
					</div>
				{/each}
			</div>
			<div class="mt-3 text-center">
				<button
					type="button"
					class="text-[12px] font-medium"
					style="color: var(--expense-ink);"
					onclick={() => (confirmClear = true)}
				>
					Clear all settled
				</button>
			</div>
		</details>
	{/if}
</div>

<!-- Bottom sheet form -->
{#if showForm}
	<BottomSheet
		bind:open={showForm}
		title={editing ? 'Edit debt' : 'New debt'}
		subtitle="Track what you owe or what's owed to you."
	>
		{#if confirmDelete}
			<div class="space-y-4 py-2">
				<div class="bg-bg-1 rounded-[var(--radius-md)] px-4 py-4 text-center">
					<p class="text-text-primary text-[14px] font-medium">
						Delete debt with "{editing?.counterparty}"?
					</p>
					<p class="text-text-subtle mt-1 text-[12px]">This can't be undone.</p>
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
						class="btn-primary w-full"
						style="background: var(--color-expense);"
					>
						Yes, delete
					</button>
				</form>
				<button type="button" onclick={() => (confirmDelete = false)} class="btn-secondary w-full">
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
				<input type="hidden" name="paid" value={String(form.paid)} />
				<input type="hidden" name="account_id" value={form.account_id} />
				<input type="hidden" name="direction" value={form.direction} />

				<!-- Segmented direction control -->
				<div class="segmented">
					<button
						type="button"
						class:active={form.direction === 'owe'}
						onclick={() => (form.direction = 'owe')}
					>
						I owe
					</button>
					<button
						type="button"
						class:active={form.direction === 'owed'}
						onclick={() => (form.direction = 'owed')}
					>
						Owed to me
					</button>
				</div>

				<!-- Amount -->
				<div class="field">
					<label for="dbt-amount">Amount</label>
					<input
						id="dbt-amount"
						name="amount"
						bind:value={form.amount}
						type="number"
						step="0.01"
						class="input amount-input"
						placeholder="0.00"
					/>
				</div>

				<!-- Counterparty -->
				<div class="field">
					<label for="dbt-counterparty">Counterparty</label>
					<input
						id="dbt-counterparty"
						name="counterparty"
						bind:value={form.counterparty}
						class="input"
						placeholder="e.g. Eli K."
					/>
				</div>

				<!-- Due date + Account -->
				<div class="field-row">
					<div class="field">
						<label for="dbt-due">Due date</label>
						<input
							id="dbt-due"
							name="due_date"
							bind:value={form.due_date}
							type="date"
							class="input"
						/>
					</div>
					{#if data.accounts.length > 0}
						<div class="field">
							<label for="dbt-account">Account</label>
							<select id="dbt-account" bind:value={form.account_id} class="input">
								<option value="">None</option>
								{#each data.accounts as a (a.id)}
									<option value={a.id}>{a.emoji ?? '💳'} {a.name}</option>
								{/each}
							</select>
						</div>
					{/if}
				</div>

				<!-- Notes -->
				<div class="field">
					<label for="dbt-notes">Notes</label>
					<input
						id="dbt-notes"
						name="notes"
						bind:value={form.notes}
						class="input"
						placeholder="e.g. Paid for me at the pub"
					/>
				</div>

				<!-- Mark paid toggle -->
				<ToggleRow
					bind:checked={form.paid}
					label="Mark paid"
					description="Moves to settled, drops from forecast."
					id="dbt-paid"
				/>

				<!-- Actions -->
				<div class="actions">
					<button type="button" class="btn-secondary" onclick={() => (showForm = false)}
						>Cancel</button
					>
					<button type="submit" class="btn-primary">Save debt</button>
				</div>

				{#if editing}
					<button type="button" onclick={() => (confirmDelete = true)} class="btn-delete">
						Delete this debt
					</button>
				{/if}
			</form>
		{/if}
	</BottomSheet>
{/if}

<BottomSheet
	bind:open={confirmClear}
	title="Clear settled debts?"
	subtitle="This permanently removes all debts you've marked as paid."
>
	<div class="space-y-3 py-2">
		<form
			method="POST"
			action="?/clearSettled"
			use:enhance={() => {
				return async ({ update }) => {
					confirmClear = false;
					await update();
				};
			}}
		>
			<button type="submit" class="btn-primary w-full" style="background: var(--color-expense);">
				Yes, clear settled
			</button>
		</form>
		<button type="button" onclick={() => (confirmClear = false)} class="btn-secondary w-full">
			Cancel
		</button>
	</div>
</BottomSheet>

<style>
	.field {
		margin-bottom: 12px;
	}
	.field label {
		display: block;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
		margin-bottom: 6px;
	}
	.input {
		width: 100%;
		height: 44px;
		padding: 0 14px;
		font: inherit;
		font-size: 15px;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		outline: none;
	}
	.input:focus {
		border-color: var(--color-text-primary);
	}
	.amount-input {
		font-size: 22px;
		font-weight: 600;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		height: 56px;
	}
	.field-row {
		display: flex;
		gap: 10px;
		margin-bottom: 12px;
	}
	.field-row .field {
		flex: 1;
		margin-bottom: 0;
	}
	.segmented {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2px;
		padding: 2px;
		background: var(--color-bg-1);
		border-radius: var(--radius-md);
		margin-bottom: 14px;
	}
	.segmented button {
		border: 0;
		background: transparent;
		font: inherit;
		height: 36px;
		font-size: 13.5px;
		font-weight: 500;
		color: var(--color-text-muted);
		border-radius: 8px;
		cursor: pointer;
	}
	.segmented button.active {
		background: var(--color-surface-1);
		color: var(--color-text-primary);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
	}
	.actions {
		display: flex;
		gap: 10px;
		margin-top: 8px;
	}
	.btn-primary {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 48px;
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		background: var(--color-accent);
		color: #fff;
		cursor: pointer;
	}
	.btn-secondary {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 48px;
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-strong);
		background: transparent;
		color: var(--color-text-primary);
		cursor: pointer;
	}
	.btn-delete {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 44px;
		margin-top: 4px;
		font: inherit;
		font-size: 15px;
		font-weight: 500;
		border-radius: 999px;
		background: transparent;
		border: none;
		color: var(--expense-ink);
		cursor: pointer;
	}
	.btn-delete:active {
		background: var(--expense-soft);
	}
</style>
