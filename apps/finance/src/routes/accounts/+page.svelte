<script lang="ts">
	import { BottomSheet, PageHeader, ToggleRow } from '@nexo/ui';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import { Plus } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { m } from '$lib/paraglide/messages.js';

	import type { Account } from '$lib/types';
	import { getIntlLocale } from '$lib/utils';

	let { data } = $props();

	let showForm = $state(false);
	let editing = $state<Account | null>(null);
	let confirmDelete = $state(false);
	let form = $state<{
		name: string;
		type: string;
		balance: number | null;
		currency: string;
		color: string;
		emoji: string;
		include_in_total: boolean;
	}>({
		name: '',
		type: 'checking',
		balance: null,
		currency: 'EUR',
		color: '',
		emoji: '',
		include_in_total: true
	});

	const TYPE_CHIPS: { id: string; emoji: string; label: string }[] = $derived([
		{ id: 'checking', emoji: '🏦', label: m.accounts_type_checking() },
		{ id: 'savings', emoji: '💰', label: m.accounts_type_savings() },
		{ id: 'investment', emoji: '📈', label: m.accounts_type_investment() },
		{ id: 'crypto', emoji: '₿', label: m.accounts_type_crypto() },
		{ id: 'cash', emoji: '💵', label: m.accounts_type_cash() }
	]);

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
	const headerSubtitle = $derived(
		data.accounts.length === 1
			? m.accounts_subtitle_one({ count: data.accounts.length, included: includedCount })
			: m.accounts_subtitle_other({ count: data.accounts.length, included: includedCount })
	);

	function getEmoji(account: Account): string {
		return account.emoji || defaultEmoji[account.type] || '📋';
	}

	function openNew() {
		editing = null;
		confirmDelete = false;
		form = {
			name: '',
			type: 'checking',
			balance: null,
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
			replaceState(url.pathname + url.search, page.state);
		}
	});

	function openEdit(account: Account) {
		editing = account;
		confirmDelete = false;
		form = {
			name: account.name,
			type: account.type,
			balance: account.balance,
			currency: data.settings.currency,
			color: account.color ?? '',
			emoji: account.emoji ?? '',
			include_in_total: account.includeInTotal
		};
		showForm = true;
	}
</script>

<div class="page">
	<PageHeader title={m.nav_accounts()} subtitle={headerSubtitle}>
		{#snippet actions()}
			<button
				type="button"
				onclick={openNew}
				aria-label={m.accounts_add_aria()}
				class="border-border-default bg-surface-1 text-text-muted active:bg-bg-1 active:text-text-primary grid size-[38px] place-items-center rounded-full border transition-colors"
			>
				<Plus size={18} strokeWidth={1.6} />
			</button>
		{/snippet}
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
	</PageHeader>

	<!-- Totals grid -->
	<div class="mt-3.5 grid grid-cols-2 gap-3">
		<!-- Liquid -->
		<div
			class="rounded-[var(--radius-lg)] border px-4 py-3"
			style="background: var(--accent-soft); border-color: var(--accent-line);"
		>
			<span class="t-label" style="color: var(--accent-ink);">{m.accounts_liquid()}</span>
			<p
				class="mt-1 font-mono text-[22px] leading-tight font-semibold tabular-nums"
				style="color: var(--accent-ink);"
			>
				{fmt(liquidBalance)}
			</p>
		</div>
		<!-- Total -->
		<div class="border-border-default bg-surface-1 rounded-[var(--radius-lg)] border px-4 py-3">
			<span class="t-label">{m.accounts_total()}</span>
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
			class="border-border-default bg-surface-1 mt-3.5 overflow-hidden rounded-[var(--radius-xl)] border"
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
			class="border-border-default mt-3.5 rounded-[var(--radius-xl)] border border-dashed p-8 text-center"
		>
			<p class="text-text-subtle text-sm">{m.accounts_empty()}</p>
		</div>
	{/if}

	<!-- Quick note -->
	<p class="text-text-faint mt-4 text-center text-[11px]">
		{m.accounts_quick_note()}
	</p>
</div>

{#if showForm}
	<BottomSheet
		bind:open={showForm}
		title={editing ? m.accounts_form_edit_title() : m.accounts_form_new_title()}
		subtitle={m.accounts_form_subtitle()}
	>
		{#if confirmDelete}
			<div class="space-y-4 py-2">
				<div class="bg-bg-1 rounded-[var(--radius-md)] px-4 py-4 text-center">
					<p class="text-text-primary text-[14px] font-medium">
						{m.accounts_form_delete_confirm({ name: editing?.name ?? '' })}
					</p>
					<p class="text-text-subtle mt-1 text-[12px]">{m.common_undone_warning()}</p>
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
						{m.common_yes_delete()}
					</button>
				</form>
				<button type="button" onclick={() => (confirmDelete = false)} class="btn-secondary w-full">
					{m.common_cancel()}
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
					<label for="acc-balance">{m.accounts_form_label_balance()}</label>
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
					<label for="acc-name">{m.accounts_form_label_name()}</label>
					<input
						id="acc-name"
						name="name"
						bind:value={form.name}
						class="input"
						placeholder={m.accounts_form_name_placeholder()}
					/>
				</div>

				<!-- Type chips -->
				<div class="field">
					<span class="field-label">{m.accounts_form_label_type()}</span>
					<div class="cats" role="group" aria-label={m.accounts_form_type_aria()}>
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
					<label for="acc-emoji">{m.accounts_form_label_emoji()}</label>
					<input
						id="acc-emoji"
						name="emoji"
						bind:value={form.emoji}
						class="input"
						placeholder={m.accounts_form_emoji_placeholder()}
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
				<ToggleRow
					bind:checked={form.include_in_total}
					label={m.accounts_form_include_label()}
					description={m.accounts_form_include_desc()}
					id="acc-liquid"
				/>

				<!-- Actions -->
				<div class="actions">
					<button type="button" class="btn-secondary" onclick={() => (showForm = false)}
						>{m.common_cancel()}</button
					>
					<button type="submit" class="btn-primary">{m.accounts_form_save()}</button>
				</div>

				{#if editing}
					<button type="button" onclick={() => (confirmDelete = true)} class="btn-delete">
						{m.accounts_form_delete()}
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
