<script lang="ts">
	import PageHeader from '$lib/components/layout/PageHeader.svelte';
	import AccountRow from '$lib/components/accounts/AccountRow.svelte';
	import BottomSheet from '$lib/components/layout/BottomSheet.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { Plus } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	import type { Account } from '$lib/types';

	let { data } = $props();

	let showForm = $state(false);
	let editing = $state<Account | null>(null);
	let confirmDelete = $state(false);
	let form = $state({
		name: '',
		type: 'checking',
		balance: '',
		currency: 'EUR',
		color: '',
		include_in_total: true
	});

	const accountTypes = ['checking', 'savings', 'crypto', 'investment', 'cash', 'other'];
	const fmt = (n: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: data.settings.currency }).format(
			n
		);

	const totalBalance = $derived(data.accounts.reduce((s: number, a: Account) => s + a.balance, 0));
	const liquidBalance = $derived(
		data.accounts
			.filter((a: Account) => a.includeInTotal)
			.reduce((s: number, a: Account) => s + a.balance, 0)
	);

	function openNew() {
		editing = null;
		confirmDelete = false;
		form = {
			name: '',
			type: 'checking',
			balance: '',
			currency: data.settings.currency,
			color: '',
			include_in_total: true
		};
		showForm = true;
	}

	function openEdit(account: Account) {
		editing = account;
		confirmDelete = false;
		form = {
			name: account.name,
			type: account.type,
			balance: String(account.balance),
			currency: data.settings.currency,
			color: account.color ?? '',
			include_in_total: account.includeInTotal
		};
		showForm = true;
	}
</script>

<div class="pb-6">
	<div class="px-4 pt-4">
		<PageHeader title="Accounts" user={data.user} displayName={data.settings.displayName}>
			{#snippet actions()}
				<button
					type="button"
					onclick={openNew}
					class="flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--color-primary-500)] px-3 py-1.5 text-xs font-medium text-white"
				>
					<Plus size={14} /> Add
				</button>
			{/snippet}
		</PageHeader>
	</div>

	<div
		class="mx-4 mb-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
	>
		<div class="flex justify-between text-sm">
			<span class="text-[var(--color-neutral)]">Total balance</span>
			<span class="font-semibold tabular-nums">{fmt(totalBalance)}</span>
		</div>
		<div class="mt-1 flex justify-between text-sm">
			<span class="text-[var(--color-neutral)]">Liquid (included)</span>
			<span class="font-semibold text-[var(--color-primary-500)] tabular-nums"
				>{fmt(liquidBalance)}</span
			>
		</div>
	</div>

	<div class="space-y-2 px-4">
		{#each data.accounts as account (account.id)}
			<AccountRow {account} currency={data.settings.currency} onEdit={openEdit} />
		{/each}
		{#if data.accounts.length === 0}
			<div
				class="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border)] p-8 text-center"
			>
				<p class="text-sm text-[var(--color-neutral)]">No accounts yet. Tap "Add" to create one.</p>
			</div>
		{/if}
	</div>
</div>

{#if showForm}
	<BottomSheet bind:open={showForm} title={editing ? 'Edit Account' : 'New Account'}>
		{#if confirmDelete}
			<div class="space-y-4 py-2">
				<div class="rounded-xl bg-[var(--color-surface-muted)] px-4 py-4 text-center">
					<p class="text-sm font-medium">Delete "{editing?.name}"?</p>
					<p class="mt-1 text-xs text-[var(--color-neutral)]">This can't be undone.</p>
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
						class="w-full rounded-[var(--radius-lg)] bg-[var(--color-expense)] py-3 text-sm font-semibold text-white"
					>
						Yes, delete
					</button>
				</form>
				<button
					type="button"
					onclick={() => (confirmDelete = false)}
					class="w-full rounded-[var(--radius-lg)] py-3 text-sm font-semibold text-[var(--color-neutral)]"
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
				<input type="hidden" name="include_in_total" value={String(form.include_in_total)} />
				<div class="space-y-3">
					<div>
						<label for="acc-name" class="mb-1 block text-xs font-medium text-[var(--color-neutral)]"
							>Name</label
						>
						<input
							id="acc-name"
							name="name"
							bind:value={form.name}
							class="input"
							placeholder="e.g. N26 Checking"
						/>
					</div>
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label
								for="acc-type"
								class="mb-1 block text-xs font-medium text-[var(--color-neutral)]">Type</label
							>
							<select id="acc-type" name="type" bind:value={form.type} class="input">
								{#each accountTypes as t (t)}<option value={t}>{t}</option>{/each}
							</select>
						</div>
						<div>
							<p class="mb-1 text-xs font-medium text-[var(--color-neutral)]">Currency</p>
							<div class="group relative">
								<div
									class="input flex cursor-default items-center justify-between opacity-60 select-none"
								>
									<span>{data.settings.currency}</span>
									<span class="text-[10px] text-[var(--color-neutral)]">?</span>
								</div>
								<div
									class="pointer-events-none absolute bottom-full left-0 mb-1.5 w-52 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[11px] text-[var(--color-neutral)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
								>
									Change your currency in Settings (top-right).
								</div>
							</div>
						</div>
					</div>
					<div>
						<label
							for="acc-balance"
							class="mb-1 block text-xs font-medium text-[var(--color-neutral)]">Balance</label
						>
						<input
							id="acc-balance"
							name="balance"
							bind:value={form.balance}
							type="number"
							step="0.01"
							class="input"
							placeholder="0.00"
						/>
					</div>
					<Toggle
						bind:checked={form.include_in_total}
						label="Include in liquid total"
						id="acc-liquid"
					/>
				</div>
				<button
					type="submit"
					class="mt-5 w-full rounded-[var(--radius-lg)] bg-[var(--color-primary-500)] py-3 text-sm font-semibold text-white"
				>
					{editing ? 'Save Changes' : 'Create Account'}
				</button>
				{#if editing}
					<button
						type="button"
						onclick={() => (confirmDelete = true)}
						class="mt-2 w-full rounded-[var(--radius-lg)] py-3 text-sm font-semibold text-[var(--color-expense)]"
					>
						Delete Account
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
		border-color: var(--color-primary-400);
	}
</style>
