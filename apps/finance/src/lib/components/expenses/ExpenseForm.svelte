<script lang="ts">
	import { BottomSheet, ToggleRow } from '@nexo/ui';
	import HeroAmount from '$lib/components/ui/HeroAmount.svelte';
	import { RECURRENCES, MONTHS } from '$lib/constants';
	import { enhance } from '$app/forms';
	import { normalizeToMonthly, formatCurrency } from '$lib/utils';
	import { m } from '$lib/paraglide/messages.js';
	import type { Expense } from '$lib/types';

	interface Props {
		open: boolean;
		editing: Expense | null;
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

	const CATEGORIES: { id: string; emoji: string; label: string }[] = $derived([
		{ id: 'housing', emoji: '🏠', label: m.expense_cat_housing() },
		{ id: 'utilities', emoji: '💡', label: m.expense_cat_utilities() },
		{ id: 'subscription', emoji: '📺', label: m.expense_cat_subscription_short() },
		{ id: 'insurance', emoji: '🛡️', label: m.expense_cat_insurance() },
		{ id: 'food', emoji: '🛒', label: m.expense_cat_food() },
		{ id: 'transport', emoji: '🚆', label: m.expense_cat_transport() },
		{ id: 'entertainment', emoji: '🎬', label: m.expense_cat_entertainment() },
		{ id: 'health', emoji: '💊', label: m.expense_cat_health() },
		{ id: 'travel', emoji: '✈️', label: m.expense_cat_travel() },
		{ id: 'gifts', emoji: '🎁', label: m.expense_cat_gifts() },
		{ id: 'fitness', emoji: '💪', label: m.expense_cat_fitness() },
		{ id: 'other', emoji: '📦', label: m.expense_cat_other() }
	]);

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
		category: 'other',
		amount: '',
		recurrence: 'monthly',
		day_of_month: '',
		due_date: '',
		starting_month: '',
		account_id: '',
		active: true,
		paid: false
	});

	const needsMonth = $derived(['quarterly', 'half-yearly', 'yearly'].includes(form.recurrence));
	const isOnce = $derived(form.recurrence === 'once');

	// Live monthly-equivalent helper
	const numericAmount = $derived(parseFloat(form.amount) || 0);
	const monthlyHelper = $derived.by(() => {
		if (numericAmount <= 0) return '';
		if (isOnce) return m.expense_form_helper_one_time();
		const eq = normalizeToMonthly(numericAmount, form.recurrence);
		if (form.recurrence === 'monthly')
			return m.expense_form_helper_monthly({ value: formatCurrency(eq, currency, true) });
		return m.expense_form_helper_monthly_equiv({ value: formatCurrency(eq, currency, true) });
	});

	$effect(() => {
		if (open) {
			confirmDelete = false;
			if (editing) {
				const once = editing.recurrence === 'once';
				form = {
					name: editing.name,
					category: editing.category,
					amount: String(editing.amount),
					recurrence: editing.recurrence,
					day_of_month: editing.dayOfMonth ?? '',
					due_date: editing.dueDate ?? '',
					starting_month: editing.startingMonth ?? '',
					account_id: editing.accountId ?? '',
					active: editing.active,
					paid: once ? !editing.active : false
				};
			} else {
				form = {
					name: '',
					category: 'other',
					amount: '',
					recurrence: 'monthly',
					day_of_month: '',
					due_date: '',
					starting_month: '',
					account_id: defaultAccountId ?? '',
					active: true,
					paid: false
				};
			}
		}
	});
</script>

<BottomSheet
	bind:open
	title={editing ? m.expense_form_edit_title() : m.expense_form_new_emoji_title()}
	subtitle={m.expense_form_subtitle()}
>
	{#if confirmDelete}
		<div class="space-y-4 py-2">
			<div class="bg-bg-1 rounded-[var(--radius-md)] px-4 py-4 text-center">
				<p class="text-text-primary text-[14px] font-medium">{m.expense_form_delete_confirm({ name: editing?.name ?? '' })}</p>
				<p class="text-text-subtle mt-1 text-[12px]">{m.common_undone_warning()}</p>
			</div>
			<form
				method="POST"
				action="/expenses?/remove"
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
			action="/expenses?/save"
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
			<input type="hidden" name="active" value={String(isOnce ? !form.paid : form.active)} />
			<input type="hidden" name="day_of_month" value={!isOnce ? form.day_of_month : ''} />
			<input type="hidden" name="due_date" value={isOnce ? form.due_date : ''} />
			<input type="hidden" name="starting_month" value={needsMonth ? form.starting_month : ''} />
			<input type="hidden" name="account_id" value={form.account_id} />
			<input type="hidden" name="category" value={form.category} />

			<!-- Hero amount -->
			<HeroAmount
				bind:value={form.amount}
				{currency}
				tone="expense"
				name="amount"
				helper={monthlyHelper}
				autofocus={!editing}
			/>

			<!-- Name -->
			<div class="field">
				<label for="exp-name">{m.expense_form_label_name()}</label>
				<input
					id="exp-name"
					name="name"
					bind:value={form.name}
					class="input"
					placeholder={m.expense_form_name_placeholder()}
				/>
			</div>

			<!-- Category chips -->
			<div class="field">
				<span class="field-label">{m.expense_form_label_category()}</span>
				<div class="cats" role="group" aria-label={m.expense_form_cat_aria()}>
					{#each CATEGORIES as cat (cat.id)}
						<button
							type="button"
							class="cat-chip"
							class:active={form.category === cat.id}
							onclick={() => (form.category = cat.id)}
						>
							<span class="cat-emoji" aria-hidden="true">{cat.emoji}</span>
							<span>{cat.label}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Recurrence pill row -->
			<div class="field">
				<span class="field-label">{m.expense_form_label_cadence()}</span>
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

			<!-- Day of month / due date -->
			{#if isOnce}
				<div class="field">
					<label for="exp-due">{m.expense_form_label_due_date()}</label>
					<input id="exp-due" bind:value={form.due_date} type="date" class="input" />
				</div>
			{:else}
				<div class="field">
					<label for="exp-dom">{m.expense_form_label_day_of_month()}</label>
					<select id="exp-dom" bind:value={form.day_of_month} class="input">
						<option value="">{m.expense_form_dom_pick_day()}</option>
						{#each Array.from({ length: 28 }, (_, i) => i + 1) as d (d)}
							<option value={String(d)}>{d}.</option>
						{/each}
						<option value="last_working">{m.expenses_last_working_day()}</option>
						<option value="second_last_working">{m.expenses_second_last_working_day()}</option>
					</select>
				</div>
			{/if}

			<!-- Starting month (for quarterly/half-yearly/yearly) -->
			{#if needsMonth}
				<div class="field">
					<label for="exp-month">{m.expense_form_label_starting_month()}</label>
					<select id="exp-month" bind:value={form.starting_month} class="input">
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
					<label for="exp-account">{m.expense_form_label_deduct_from()}</label>
					<select id="exp-account" bind:value={form.account_id} class="input">
						<option value="">{m.expense_form_account_none()}</option>
						{#each accounts as a (a.id)}
							<option value={a.id}>{a.emoji ?? '💳'} {a.name}</option>
						{/each}
					</select>
				</div>
			{/if}

			<!-- Toggle -->
			{#if isOnce}
				<ToggleRow
					bind:checked={form.paid}
					label={m.expense_form_paid_label()}
					description={m.expense_form_paid_desc()}
					id="exp-paid"
				/>
			{:else}
				<ToggleRow
					bind:checked={form.active}
					label={m.expense_form_active_label()}
					description={m.expense_form_active_desc()}
					id="exp-active"
				/>
			{/if}

			<!-- Actions -->
			<div class="actions">
				<button type="button" class="btn-secondary" onclick={() => (open = false)}>{m.common_cancel()}</button>
				<button type="submit" class="btn-primary">
					<span>{m.expense_form_save()}</span>
					<span aria-hidden="true">→</span>
				</button>
			</div>

			{#if editing}
				<button type="button" onclick={() => (confirmDelete = true)} class="btn-delete">
					{m.expense_form_delete()}
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
	.cats {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}
	.cat-chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 7px 11px;
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
	.cat-chip:active {
		transform: scale(0.97);
	}
	.cat-chip .cat-emoji {
		font-size: 14px;
		line-height: 1;
	}
	.cat-chip.active {
		background: var(--expense-soft);
		border-color: var(--expense-line);
		color: var(--expense-ink);
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
		background: var(--expense-soft);
		border-color: var(--expense-line);
		color: var(--expense-ink);
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
		color: var(--expense-ink);
		cursor: pointer;
	}
	.btn-delete:active {
		background: var(--expense-soft);
	}
</style>
