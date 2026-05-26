<script lang="ts">
	import { BottomSheet, ToggleRow } from '@nexo/ui';
	import HeroAmount from '$lib/components/ui/HeroAmount.svelte';
	import { RECURRENCES, MONTHS } from '$lib/constants';
	import { enhance } from '$app/forms';
	import { normalizeToMonthly, formatCurrency } from '$lib/utils';
	import { m } from '$lib/paraglide/messages.js';
	import type { Income } from '$lib/types';

	interface Props {
		open: boolean;
		editing: Income | null;
		accounts: { id: string; name: string; emoji: string | null }[];
		defaultAccountId?: string | null;
		currency?: string;
	}

	let {
		open = $bindable(false),
		editing,
		accounts,
		defaultAccountId = null,
		currency = 'EUR'
	}: Props = $props();

	const RECURRENCE_LABELS: Record<string, { label: string; emoji: string }> = $derived({
		once: { label: m.recurrence_once(), emoji: '⚡' },
		weekly: { label: m.recurrence_weekly(), emoji: '📅' },
		biweekly: { label: m.recurrence_biweekly(), emoji: '📆' },
		monthly: { label: m.recurrence_monthly(), emoji: '🔁' },
		quarterly: { label: m.recurrence_quarterly(), emoji: '🗓️' },
		'half-yearly': { label: m.recurrence_half_yearly(), emoji: '🌗' },
		yearly: { label: m.recurrence_yearly(), emoji: '🎂' }
	});

	let confirmDelete = $state(false);
	let form = $state({
		name: '',
		amount: '',
		recurrence: 'monthly',
		day_of_month: '',
		expected_date: '',
		starting_month: '',
		account_id: '',
		received: false
	});

	const needsMonth = $derived(['quarterly', 'half-yearly', 'yearly'].includes(form.recurrence));
	const isOnce = $derived(form.recurrence === 'once');

	const numericAmount = $derived(parseFloat(form.amount) || 0);
	const monthlyHelper = $derived.by(() => {
		if (numericAmount <= 0) return '';
		if (isOnce) return m.income_form_helper_one_time();
		const eq = normalizeToMonthly(numericAmount, form.recurrence);
		if (form.recurrence === 'monthly')
			return m.income_form_helper_monthly({ value: formatCurrency(eq, currency, true) });
		return m.income_form_helper_monthly_equiv({ value: formatCurrency(eq, currency, true) });
	});

	$effect(() => {
		if (open) {
			confirmDelete = false;
			if (editing) {
				form = {
					name: editing.name,
					amount: String(editing.amount),
					recurrence: editing.recurrence,
					day_of_month: editing.dayOfMonth ?? '',
					expected_date: editing.expectedDate ?? '',
					starting_month: editing.startingMonth ?? '',
					account_id: editing.accountId ?? '',
					received: editing.received
				};
			} else {
				form = {
					name: '',
					amount: '',
					recurrence: 'monthly',
					day_of_month: '',
					expected_date: '',
					starting_month: '',
					account_id: defaultAccountId ?? '',
					received: false
				};
			}
		}
	});
</script>

<BottomSheet
	bind:open
	title={editing ? m.income_form_edit_title() : m.income_form_new_emoji_title()}
	subtitle={m.income_form_subtitle()}
>
	{#if confirmDelete}
		<div class="space-y-4 py-2">
			<div class="bg-bg-1 rounded-[var(--radius-md)] px-4 py-4 text-center">
				<p class="text-text-primary text-[14px] font-medium">{m.income_form_delete_confirm({ name: editing?.name ?? '' })}</p>
				<p class="text-text-subtle mt-1 text-[12px]">{m.common_undone_warning()}</p>
			</div>
			<form
				method="POST"
				action="/income?/remove"
				use:enhance={() => {
					return async ({ update }) => {
						open = false;
						await update();
					};
				}}
			>
				<input type="hidden" name="id" value={editing?.id} />
				<button type="submit" class="btn-primary w-full" style="background: var(--color-expense);">
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
			action="/income?/save"
			use:enhance={() => {
				return async ({ update }) => {
					open = false;
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
			<input type="hidden" name="account_id" value={form.account_id} />

			<!-- Hero amount -->
			<HeroAmount
				bind:value={form.amount}
				{currency}
				tone="income"
				name="amount"
				helper={monthlyHelper}
				autofocus={!editing}
			/>

			<!-- Name -->
			<div class="field">
				<label for="inc-name">{m.income_form_label_name()}</label>
				<input
					id="inc-name"
					name="name"
					bind:value={form.name}
					class="input"
					placeholder={m.income_form_name_placeholder()}
				/>
			</div>

			<!-- Recurrence pill row -->
			<div class="field">
				<span class="field-label">{m.income_form_label_cadence()}</span>
				<div class="recur-row">
					{#each RECURRENCES as r (r)}
						{@const meta = RECURRENCE_LABELS[r] ?? { label: r, emoji: '·' }}
						<button
							type="button"
							class="recur-pill"
							class:active={form.recurrence === r}
							onclick={() => (form.recurrence = r)}
						>
							<span aria-hidden="true">{meta.emoji}</span>
							<span>{meta.label}</span>
						</button>
					{/each}
				</div>
				<input type="hidden" name="recurrence" value={form.recurrence} />
			</div>

			<!-- Day / date -->
			{#if isOnce}
				<div class="field">
					<label for="inc-exp-date">{m.income_form_label_expected_date()}</label>
					<input id="inc-exp-date" bind:value={form.expected_date} type="date" class="input" />
				</div>
			{:else}
				<div class="field">
					<label for="inc-dom">{m.income_form_label_day_of_month()}</label>
					<select id="inc-dom" bind:value={form.day_of_month} class="input">
						<option value="">{m.income_form_dom_pick_day()}</option>
						{#each Array.from({ length: 28 }, (_, i) => i + 1) as d (d)}
							<option value={String(d)}>{d}.</option>
						{/each}
						<option value="last_working">{m.expenses_last_working_day()}</option>
						<option value="second_last_working">{m.expenses_second_last_working_day()}</option>
					</select>
				</div>
			{/if}

			<!-- Starting month -->
			{#if needsMonth}
				<div class="field">
					<label for="inc-month">{m.income_form_label_starting_month()}</label>
					<select id="inc-month" bind:value={form.starting_month} class="input">
						<option value="">{m.common_select_placeholder()}</option>
						{#each MONTHS as month, i (month)}
							<option value={String(i + 1)}>{month}</option>
						{/each}
					</select>
				</div>
			{/if}

			<!-- Account selector -->
			{#if accounts.length > 0}
				<div class="field">
					<label for="inc-account">{m.income_form_label_deposit_to()}</label>
					<select id="inc-account" bind:value={form.account_id} class="input">
						<option value="">{m.income_form_account_none()}</option>
						{#each accounts as a (a.id)}
							<option value={a.id}>{a.emoji ?? '💳'} {a.name}</option>
						{/each}
					</select>
				</div>
			{/if}

			<!-- Toggle -->
			{#if isOnce}
				<ToggleRow
					bind:checked={form.received}
					label={m.income_form_received_label()}
					description={m.income_form_received_desc_once()}
					id="inc-received"
				/>
			{:else}
				<ToggleRow
					bind:checked={form.received}
					label={m.income_form_received_label()}
					description={m.income_form_received_desc_recurring()}
					id="inc-received"
				/>
			{/if}

			<!-- Actions -->
			<div class="actions">
				<button type="button" class="btn-secondary" onclick={() => (open = false)}>{m.common_cancel()}</button>
				<button type="submit" class="btn-primary">
					<span>{m.income_form_save()}</span>
					<span aria-hidden="true">→</span>
				</button>
			</div>

			{#if editing}
				<button type="button" onclick={() => (confirmDelete = true)} class="btn-delete">
					{m.income_form_delete()}
				</button>
			{/if}
		</form>
	{/if}
</BottomSheet>

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
	.recur-row {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		scrollbar-width: none;
		padding-bottom: 2px;
	}
	.recur-row::-webkit-scrollbar {
		display: none;
	}
	.recur-pill {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 8px 12px;
		border-radius: 999px;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-subtle);
		font: inherit;
		font-size: 12.5px;
		color: var(--color-text-muted);
		cursor: pointer;
		transition:
			background var(--duration-fast) var(--ease-out),
			border-color var(--duration-fast) var(--ease-out),
			color var(--duration-fast) var(--ease-out);
	}
	.recur-pill.active {
		background: var(--income-soft);
		border-color: var(--income-line);
		color: var(--income-ink);
		font-weight: 500;
	}
	.actions {
		display: flex;
		gap: 10px;
		margin-top: 12px;
	}
	.btn-primary {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		height: 50px;
		font: inherit;
		font-size: 15.5px;
		font-weight: 600;
		letter-spacing: -0.005em;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		background: var(--color-text-primary);
		color: var(--color-bg-0);
		cursor: pointer;
		transition: transform var(--duration-fast) var(--ease-out);
	}
	.btn-primary:active {
		transform: scale(0.98);
	}
	.btn-secondary {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 50px;
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
		color: var(--income-ink);
		cursor: pointer;
	}
	.btn-delete:active {
		background: var(--income-soft);
	}
</style>
