<script lang="ts">
	import BottomSheet from '$lib/components/layout/BottomSheet.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { RECURRENCES, MONTHS } from '$lib/constants';
	import { enhance } from '$app/forms';
	import type { Income } from '$lib/types';

	interface Props {
		open: boolean;
		editing: Income | null;
		accounts: { id: string; name: string; emoji: string | null }[];
		defaultAccountId?: string | null;
	}

	let { open = $bindable(false), editing, accounts, defaultAccountId = null }: Props = $props();

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
	title={editing ? 'Edit income' : 'New income'}
	subtitle="Track what comes in, on cadence."
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
			<input type="hidden" name="received" value={String(form.received)} />
			<input type="hidden" name="day_of_month" value={!isOnce ? form.day_of_month : ''} />
			<input type="hidden" name="expected_date" value={isOnce ? form.expected_date : ''} />
			<input type="hidden" name="starting_month" value={needsMonth ? form.starting_month : ''} />
			<input type="hidden" name="account_id" value={form.account_id} />

			<!-- Amount -->
			<div class="field">
				<label for="inc-amount">Amount</label>
				<input
					id="inc-amount"
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
				<label for="inc-name">Name</label>
				<input
					id="inc-name"
					name="name"
					bind:value={form.name}
					class="input"
					placeholder="e.g. Salary"
				/>
			</div>

			<!-- Recurrence + Day/Date -->
			{#if isOnce}
				<div class="field-row">
					<div class="field">
						<label for="inc-recurrence">Recurrence</label>
						<select
							id="inc-recurrence"
							name="recurrence"
							bind:value={form.recurrence}
							class="input"
						>
							{#each RECURRENCES as r (r)}<option value={r}>{r}</option>{/each}
						</select>
					</div>
					<div class="field">
						<label for="inc-exp-date">Expected date</label>
						<input id="inc-exp-date" bind:value={form.expected_date} type="date" class="input" />
					</div>
				</div>
			{:else}
				<div class="field-row">
					<div class="field">
						<label for="inc-recurrence">Recurrence</label>
						<select
							id="inc-recurrence"
							name="recurrence"
							bind:value={form.recurrence}
							class="input"
						>
							{#each RECURRENCES as r (r)}<option value={r}>{r}</option>{/each}
						</select>
					</div>
					<div class="field">
						<label for="inc-dom">Day of month</label>
						<select id="inc-dom" bind:value={form.day_of_month} class="input">
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

			<!-- Starting month -->
			{#if needsMonth}
				<div class="field">
					<label for="inc-month">Starting month</label>
					<select id="inc-month" bind:value={form.starting_month} class="input">
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
					<label for="inc-account">Deposit to</label>
					<select id="inc-account" bind:value={form.account_id} class="input">
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
					bind:checked={form.received}
					label="Already received"
					description="Won't appear in forecasts."
					id="inc-received"
				/>
			{:else}
				<Toggle
					bind:checked={form.received}
					label="Already received"
					description="Marks current cycle as received."
					id="inc-received"
				/>
			{/if}

			<!-- Actions -->
			<div class="actions">
				<button type="button" class="btn-secondary" onclick={() => (open = false)}>Cancel</button>
				<button type="submit" class="btn-primary">Save income</button>
			</div>

			{#if editing}
				<button type="button" onclick={() => (confirmDelete = true)} class="btn-delete">
					Delete this income
				</button>
			{/if}
		</form>
	{/if}
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
		color: var(--income-ink);
		cursor: pointer;
	}
	.btn-delete:active {
		background: var(--income-soft);
	}
</style>
