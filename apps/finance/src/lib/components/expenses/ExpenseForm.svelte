<script lang="ts">
	import BottomSheet from '$lib/components/layout/BottomSheet.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { RECURRENCES, MONTHS } from '$lib/constants';
	import { enhance } from '$app/forms';
	import type { Expense } from '$lib/types';

	interface Props {
		open: boolean;
		editing: Expense | null;
		accounts: { id: string; name: string; emoji: string | null }[];
		defaultAccountId?: string | null;
	}

	let { open = $bindable(false), editing, accounts, defaultAccountId = null }: Props = $props();

	const CATEGORIES: { id: string; emoji: string; label: string }[] = [
		{ id: 'housing', emoji: '🏠', label: 'housing' },
		{ id: 'utilities', emoji: '💡', label: 'utility' },
		{ id: 'subscription', emoji: '📺', label: 'subscription' },
		{ id: 'insurance', emoji: '🛡️', label: 'insurance' },
		{ id: 'food', emoji: '🛒', label: 'food' },
		{ id: 'transport', emoji: '🚆', label: 'transport' },
		{ id: 'other', emoji: '📦', label: 'other' }
	];

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
	title={editing ? 'Edit expense' : 'New expense'}
	subtitle="Recurring or one-time — we'll do the monthly math."
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
						open = false;
						await update();
					};
				}}
			>
				<input type="hidden" name="id" value={editing?.id} />
				<button type="submit" class="btn-primary w-full" style="background: var(--color-expense);">
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

			<!-- Amount -->
			<div class="field">
				<label for="exp-amount">Amount</label>
				<input
					id="exp-amount"
					name="amount"
					bind:value={form.amount}
					type="number"
					step="0.01"
					class="input amount-input"
					placeholder="0.00"
				/>
			</div>

			<!-- Name -->
			<div class="field">
				<label for="exp-name">Name</label>
				<input
					id="exp-name"
					name="name"
					bind:value={form.name}
					class="input"
					placeholder="e.g. Spotify Family"
				/>
			</div>

			<!-- Category chips -->
			<div class="field">
				<span class="field-label">Category</span>
				<div class="cats" role="group" aria-label="Category">
					{#each CATEGORIES as cat (cat.id)}
						<button
							type="button"
							class="cat-chip"
							class:active={form.category === cat.id}
							onclick={() => (form.category = cat.id)}
						>
							{cat.emoji}
							{cat.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Recurrence + Day -->
			{#if isOnce}
				<div class="field-row">
					<div class="field">
						<label for="exp-recurrence">Recurrence</label>
						<select
							id="exp-recurrence"
							name="recurrence"
							bind:value={form.recurrence}
							class="input"
						>
							{#each RECURRENCES as r (r)}<option value={r}>{r}</option>{/each}
						</select>
					</div>
					<div class="field">
						<label for="exp-due">Due date</label>
						<input id="exp-due" bind:value={form.due_date} type="date" class="input" />
					</div>
				</div>
			{:else}
				<div class="field-row">
					<div class="field">
						<label for="exp-recurrence">Recurrence</label>
						<select
							id="exp-recurrence"
							name="recurrence"
							bind:value={form.recurrence}
							class="input"
						>
							{#each RECURRENCES as r (r)}<option value={r}>{r}</option>{/each}
						</select>
					</div>
					<div class="field">
						<label for="exp-dom">Day of month</label>
						<select id="exp-dom" bind:value={form.day_of_month} class="input">
							<option value="">—</option>
							{#each Array.from({ length: 28 }, (_, i) => i + 1) as d (d)}
								<option value={String(d)}>{d}</option>
							{/each}
							<option value="last_working">Last working</option>
							<option value="second_last_working">2nd-last</option>
						</select>
					</div>
				</div>
			{/if}

			<!-- Starting month (for quarterly/half-yearly/yearly) -->
			{#if needsMonth}
				<div class="field">
					<label for="exp-month">Starting month</label>
					<select id="exp-month" bind:value={form.starting_month} class="input">
						<option value="">— select —</option>
						{#each MONTHS as m, i (m)}
							<option value={String(i + 1)}>{m}</option>
						{/each}
					</select>
				</div>
			{/if}

			<!-- Account selector -->
			{#if accounts.length > 0}
				<div class="field">
					<label for="exp-account">Deduct from</label>
					<select id="exp-account" bind:value={form.account_id} class="input">
						<option value="">None (manual)</option>
						{#each accounts as a (a.id)}
							<option value={a.id}>{a.emoji ?? '💳'} {a.name}</option>
						{/each}
					</select>
				</div>
			{/if}

			<!-- Toggle -->
			{#if isOnce}
				<Toggle
					bind:checked={form.paid}
					label="Paid"
					description="Marks as completed."
					id="exp-paid"
				/>
			{:else}
				<Toggle
					bind:checked={form.active}
					label="Active"
					description="Counted in forecasts and monthly equivalent."
					id="exp-active"
				/>
			{/if}

			<!-- Actions -->
			<div class="actions">
				<button type="button" class="btn-secondary" onclick={() => (open = false)}>Cancel</button>
				<button type="submit" class="btn-primary">Save expense</button>
			</div>

			{#if editing}
				<button type="button" onclick={() => (confirmDelete = true)} class="btn-delete">
					Delete this expense
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
