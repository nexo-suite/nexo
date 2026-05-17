<script lang="ts">
	import BottomSheet from '$lib/components/layout/BottomSheet.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { Plus } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	import type { Account } from '$lib/types';
	import { getIntlLocale } from '$lib/utils';

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
		emoji: '',
		include_in_total: true
	});

	const TYPE_CHIPS: { id: string; emoji: string; label: string }[] = [
		{ id: 'checking', emoji: '🏦', label: 'Checking' },
		{ id: 'savings', emoji: '💰', label: 'Savings' },
		{ id: 'investment', emoji: '📈', label: 'Investment' },
		{ id: 'crypto', emoji: '₿', label: 'Crypto' },
		{ id: 'cash', emoji: '💵', label: 'Cash' }
	];

	const defaultEmoji: Record<string, string> = {
		checking: '🏦',
		savings: '💰',
		investment: '📈',
		crypto: '₿',
		cash: '💵',
		other: '📋'
	};

	const fmt = (n: number) =>
		new Intl.NumberFormat(getIntlLocale(), {
			style: 'currency',
			currency: data.settings.currency,
			minimumFractionDigits: data.settings.hideCents ? 0 : 2,
			maximumFractionDigits: data.settings.hideCents ? 0 : 2
		}).format(n);

	const totalBalance = $derived(data.accounts.reduce((s: number, a: Account) => s + a.balance, 0));
	const liquidBalance = $derived(
		data.accounts
			.filter((a: Account) => a.includeInTotal)
			.reduce((s: number, a: Account) => s + a.balance, 0)
	);
	const includedCount = $derived(data.accounts.filter((a: Account) => a.includeInTotal).length);

	function getEmoji(account: Account): string {
		return account.emoji || defaultEmoji[account.type] || '📋';
	}

	function openNew() {
		editing = null;
		confirmDelete = false;
		form = {
			name: '',
			type: 'checking',
			balance: '',
			currency: data.settings.currency,
			color: '',
			emoji: '',
			include_in_total: true
		};
		showForm = true;
	}

	$effect(() => {
		if (page.url.searchParams.get('add') === 'true') {
			openNew();
			const url = new URL(page.url);
			url.searchParams.delete('add');
			history.replaceState({}, '', url.toString());
		}
	});

	function openEdit(account: Account) {
		editing = account;
		confirmDelete = false;
		form = {
			name: account.name,
			type: account.type,
			balance: String(account.balance),
			currency: data.settings.currency,
			color: account.color ?? '',
			emoji: account.emoji ?? '',
			include_in_total: account.includeInTotal
		};
		showForm = true;
	}
</script>

<div class="px-5 pt-5 pb-6">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<h1 class="text-text-primary text-[26px] leading-tight font-semibold">Accounts</h1>
			<p class="text-text-subtle mt-0.5 text-[13px]">
				{data.accounts.length} account{data.accounts.length !== 1 ? 's' : ''} &middot; {includedCount}
				included
			</p>
		</div>
		<button
			type="button"
			onclick={openNew}
			class="border-border-default bg-surface-1 flex h-[38px] w-[38px] items-center justify-center rounded-full border"
		>
			<Plus size={18} class="text-text-muted" />
		</button>
	</div>

	<!-- Totals grid -->
	<div class="mt-5 grid grid-cols-2 gap-3">
		<!-- Liquid -->
		<div
			class="rounded-[var(--radius-lg)] border px-4 py-3"
			style="background: var(--accent-soft); border-color: var(--accent-line);"
		>
			<span class="t-label" style="color: var(--accent-ink);">Liquid</span>
			<p
				class="mt-1 font-mono text-[22px] leading-tight font-semibold tabular-nums"
				style="color: var(--accent-ink);"
			>
				{fmt(liquidBalance)}
			</p>
		</div>
		<!-- Total -->
		<div class="border-border-default bg-surface-1 rounded-[var(--radius-lg)] border px-4 py-3">
			<span class="t-label">Total</span>
			<p
				class="text-text-primary mt-1 font-mono text-[22px] leading-tight font-semibold tabular-nums"
			>
				{fmt(totalBalance)}
			</p>
		</div>
	</div>

	<!-- Account list -->
	{#if data.accounts.length > 0}
		<div
			class="border-border-default bg-surface-1 mt-5 overflow-hidden rounded-[var(--radius-xl)] border"
		>
			{#each data.accounts as account, i (account.id)}
				<button
					type="button"
					onclick={() => openEdit(account)}
					class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-bg-1{i >
					0
						? ' border-border-subtle border-t'
						: ''}"
					class:dimmed={!account.includeInTotal}
				>
					<!-- Emoji -->
					<div
						class="border-border-subtle bg-bg-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] border text-lg"
						class:opacity-60={!account.includeInTotal}
					>
						{getEmoji(account)}
					</div>
					<!-- Info -->
					<div class="min-w-0 flex-1">
						<p class="text-text-primary truncate text-[15px] font-medium">{account.name}</p>
						<span class="t-label">{account.type}</span>
					</div>
					<!-- Balance -->
					<span
						class="shrink-0 font-mono text-[15px] font-semibold tabular-nums"
						class:text-text-faint={!account.includeInTotal}
						class:text-text-primary={account.includeInTotal}
					>
						{fmt(account.balance)}
					</span>
				</button>
			{/each}
		</div>
	{:else}
		<div
			class="border-border-default mt-5 rounded-[var(--radius-xl)] border border-dashed p-8 text-center"
		>
			<p class="text-text-subtle text-sm">No accounts yet. Tap the + button to create one.</p>
		</div>
	{/if}

	<!-- Quick note -->
	<p class="text-text-faint mt-4 text-center text-[11px]">
		Tap an account to edit. "Liquid" sums only included accounts.
	</p>
</div>

{#if showForm}
	<BottomSheet
		bind:open={showForm}
		title={editing ? 'Edit account' : 'New account'}
		subtitle="Pick a type — emoji is just for looks."
	>
		{#if confirmDelete}
			<div class="space-y-4 py-2">
				<div class="bg-bg-1 rounded-[var(--radius-md)] px-4 py-4 text-center">
					<p class="text-text-primary text-[14px] font-medium">Delete "{editing?.name}"?</p>
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
				<input type="hidden" name="include_in_total" value={String(form.include_in_total)} />
				<input type="hidden" name="type" value={form.type} />

				<!-- Balance -->
				<div class="field">
					<label for="acc-balance">Balance</label>
					<input
						id="acc-balance"
						name="balance"
						bind:value={form.balance}
						type="number"
						step="0.01"
						class="input amount-input"
						placeholder="0.00"
					/>
				</div>

				<!-- Name -->
				<div class="field">
					<label for="acc-name">Name</label>
					<input
						id="acc-name"
						name="name"
						bind:value={form.name}
						class="input"
						placeholder="e.g. Sparkasse Checking"
					/>
				</div>

				<!-- Type chips -->
				<div class="field">
					<span class="field-label">Type</span>
					<div class="cats" role="group" aria-label="Account type">
						{#each TYPE_CHIPS as chip (chip.id)}
							<button
								type="button"
								class="cat-chip"
								class:active={form.type === chip.id}
								onclick={() => (form.type = chip.id)}
							>
								{chip.emoji}
								{chip.label}
							</button>
						{/each}
					</div>
				</div>

				<!-- Emoji override -->
				<div class="field">
					<label for="acc-emoji">Custom emoji</label>
					<input
						id="acc-emoji"
						name="emoji"
						bind:value={form.emoji}
						class="input"
						placeholder="e.g. 🏦 (optional)"
						maxlength="4"
						oninput={(e) => {
							const val = e.currentTarget.value;
							if (!val) return;
							const segments = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
							const first = [...segments.segment(val)][0]?.segment ?? '';
							if (first !== val) form.emoji = first;
						}}
					/>
				</div>

				<!-- Include in liquid toggle -->
				<Toggle
					bind:checked={form.include_in_total}
					label="Include in liquid total"
					description="Used by forecast & dashboard hero."
					id="acc-liquid"
				/>

				<!-- Actions -->
				<div class="actions">
					<button type="button" class="btn-secondary" onclick={() => (showForm = false)}
						>Cancel</button
					>
					<button type="submit" class="btn-primary">Save account</button>
				</div>

				{#if editing}
					<button type="button" onclick={() => (confirmDelete = true)} class="btn-delete">
						Delete this account
					</button>
				{/if}
			</form>
		{/if}
	</BottomSheet>
{/if}

<style>
	.field {
		margin-bottom: 12px;
	}
	.field label,
	.field .field-label {
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
	.cats {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.cat-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 12px;
		border-radius: 999px;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-subtle);
		font-size: 13px;
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.cat-chip.active {
		background: var(--accent-soft);
		border-color: var(--accent-line);
		color: var(--accent-ink);
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
