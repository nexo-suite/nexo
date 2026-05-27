<script lang="ts">
	import { ChevronLeft, ChevronRight, Plus, Trash2, X } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { tick, untrack } from 'svelte';
	import type { WeightPoint } from '$lib/utils/weightStats';
	import { m } from '$lib/paraglide/messages.js';

	let {
		weights,
		editingDate = $bindable<string | null>(null),
		latestKg
	}: {
		weights: WeightPoint[];
		editingDate?: string | null;
		latestKg: number | null;
	} = $props();

	const MS_PER_DAY = 24 * 60 * 60 * 1000;
	const todayIso = new Date().toISOString().slice(0, 10);
	const earliestIso = new Date(Date.now() - 30 * MS_PER_DAY).toISOString().slice(0, 10);

	let kg = $state<number>(75);
	let inputEl = $state<HTMLInputElement | null>(null);
	let confirmingDelete = $state(false);

	const open = $derived(editingDate != null);
	const editingExisting = $derived.by(() => {
		if (!editingDate) return false;
		return weights.some((w) => w.date === editingDate);
	});
	const hasToday = $derived(weights.some((w) => w.date === todayIso));
	const todayWeight = $derived(weights.find((w) => w.date === todayIso));

	$effect(() => {
		if (!editingDate) {
			confirmingDelete = false;
			return;
		}
		const existing = weights.find((w) => w.date === editingDate);
		kg = existing ? existing.kg : (untrack(() => latestKg) ?? 75);
		confirmingDelete = false;
		tick().then(() => inputEl?.focus());
	});

	const dateLabel = $derived.by(() => {
		if (!editingDate) return '';
		if (editingDate === todayIso) return m.weight_date_today();
		const yesterday = new Date(Date.now() - MS_PER_DAY).toISOString().slice(0, 10);
		if (editingDate === yesterday) return m.weight_date_yesterday();
		const d = new Date(`${editingDate}T00:00:00Z`);
		return new Intl.DateTimeFormat('en', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		}).format(d);
	});

	const canStepBack = $derived(editingDate != null && editingDate > earliestIso);
	const canStepForward = $derived(editingDate != null && editingDate < todayIso);

	function shiftDay(delta: -1 | 1) {
		if (!editingDate) return;
		const ms = Date.parse(`${editingDate}T00:00:00Z`) + delta * MS_PER_DAY;
		const next = new Date(ms).toISOString().slice(0, 10);
		if (next > todayIso || next < earliestIso) return;
		editingDate = next;
	}

	function bumpKg(delta: number) {
		kg = Math.max(20, Math.min(400, Math.round((kg + delta) * 10) / 10));
	}

	function close() {
		editingDate = null;
	}

	function openToday() {
		editingDate = todayIso;
	}
</script>

{#if !open}
	<button class="prompt" type="button" onclick={openToday}>
		<span class="p-mark" aria-hidden="true">
			{#if hasToday}
				<span class="p-dot" aria-hidden="true"></span>
			{:else}
				<Plus size={14} strokeWidth={1.9} />
			{/if}
		</span>
		<span class="p-label">
			{#if hasToday && todayWeight}
				<span class="p-eyebrow eyebrow">{m.weight_today_logged_eyebrow()}</span>
				<span class="p-num tnum">{todayWeight.kg.toFixed(1)}<span class="p-unit"> kg</span></span>
			{:else}
				<span class="p-eyebrow eyebrow">{m.weight_log_today_eyebrow()}</span>
				<span class="p-cta serif-italic">{m.weight_log_today_cta()}</span>
			{/if}
		</span>
		<span class="p-edge serif-italic">{hasToday ? m.action_edit() : m.action_save()}</span>
	</button>
{:else}
	<form
		class="composer"
		method="POST"
		action="/weight?/logWeight"
		use:enhance={() => {
			return async ({ update }) => {
				await update();
				close();
			};
		}}
	>
		<input type="hidden" name="date" value={editingDate} />
		<input type="hidden" name="kg" value={kg.toFixed(1)} />

		<header class="c-head">
			<div class="c-date">
				<button
					type="button"
					class="c-step"
					disabled={!canStepBack}
					onclick={() => shiftDay(-1)}
					aria-label={m.weight_step_earlier()}
				>
					<ChevronLeft size={14} strokeWidth={1.7} />
				</button>
				<span class="c-date-label serif-display">{dateLabel}</span>
				<button
					type="button"
					class="c-step"
					disabled={!canStepForward}
					onclick={() => shiftDay(1)}
					aria-label={m.weight_step_later()}
				>
					<ChevronRight size={14} strokeWidth={1.7} />
				</button>
			</div>
			<button type="button" class="c-close" onclick={close} aria-label={m.action_close()}>
				<X size={14} strokeWidth={1.7} />
			</button>
		</header>

		<div class="c-num-row">
			<button type="button" class="c-bump" onclick={() => bumpKg(-0.1)} aria-label="−0.1">
				<span aria-hidden="true">−</span>
			</button>
			<input
				bind:this={inputEl}
				class="c-input tnum"
				type="number"
				inputmode="decimal"
				step="0.1"
				min="20"
				max="400"
				bind:value={kg}
			/>
			<span class="c-unit">kg</span>
			<button type="button" class="c-bump" onclick={() => bumpKg(0.1)} aria-label="+0.1">
				<span aria-hidden="true">+</span>
			</button>
		</div>

		<div class="c-actions">
			{#if editingExisting}
				{#if confirmingDelete}
					<button
						type="submit"
						class="c-delete-confirm"
						formaction="/weight?/deleteWeight"
						formnovalidate
					>
						<Trash2 size={13} strokeWidth={1.7} />
						<span>{m.weight_delete_confirm()}</span>
					</button>
					<button
						type="button"
						class="c-cancel"
						onclick={() => (confirmingDelete = false)}
					>
						{m.action_cancel()}
					</button>
				{:else}
					<button
						type="button"
						class="c-delete"
						onclick={() => (confirmingDelete = true)}
						aria-label={m.action_delete()}
					>
						<Trash2 size={13} strokeWidth={1.7} />
					</button>
					<button type="submit" class="c-save">{m.action_save()}</button>
				{/if}
			{:else}
				<button type="submit" class="c-save c-save-full">{m.weight_save_entry()}</button>
			{/if}
		</div>
	</form>
{/if}

<style>
	.prompt {
		all: unset;
		cursor: pointer;
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 14px;
		padding: 14px 16px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: 14px;
		transition:
			border-color 200ms,
			background 200ms,
			transform 120ms;
	}

	.prompt:hover {
		border-color: var(--ember-line);
		background: var(--ember-tint-bg);
	}

	.prompt:active {
		transform: scale(0.992);
	}

	.p-mark {
		width: 30px;
		height: 30px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		background: var(--ember-tint-bg);
		color: var(--color-ember-deep);
	}

	.p-dot {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--color-ember);
	}

	.p-label {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.p-eyebrow {
		color: var(--color-text-faint);
		font-size: 9.5px;
	}

	.p-cta {
		font-size: 16px;
		color: var(--color-text-muted);
		font-variation-settings:
			'opsz' 24,
			'SOFT' 100,
			'wght' 440,
			'ital' 1;
	}

	.p-num {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variation-settings:
			'opsz' 36,
			'SOFT' 80,
			'wght' 470;
		font-size: 22px;
		line-height: 1;
		letter-spacing: -0.02em;
		color: var(--color-text-primary);
	}

	.p-unit {
		font-size: 12px;
		color: var(--color-text-subtle);
		font-variation-settings:
			'opsz' 18,
			'SOFT' 80,
			'wght' 420;
	}

	.p-edge {
		font-size: 12px;
		color: var(--color-ember-deep);
		opacity: 0.85;
		font-variation-settings:
			'opsz' 18,
			'SOFT' 100,
			'wght' 420,
			'ital' 1;
	}

	.composer {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 16px 16px 14px;
		background: var(--color-surface-1);
		border: 1px solid var(--ember-line);
		border-radius: 14px;
		box-shadow: 0 1px 0 color-mix(in oklab, var(--color-ember) 8%, transparent);
		animation: composer-in 280ms cubic-bezier(0.32, 0.72, 0, 1);
	}

	@keyframes composer-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.c-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.c-date {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.c-step {
		all: unset;
		cursor: pointer;
		width: 24px;
		height: 24px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		color: var(--color-text-muted);
		transition: all 140ms;
	}

	.c-step:active {
		background: var(--ember-tint-bg);
		color: var(--color-ember-deep);
	}

	.c-step:disabled {
		opacity: 0.25;
		cursor: not-allowed;
	}

	.c-date-label {
		font-size: 16px;
		color: var(--color-text-primary);
		min-width: 8ch;
		text-align: center;
		font-variation-settings:
			'opsz' 24,
			'SOFT' 100,
			'wght' 460,
			'ital' 0;
	}

	.c-close {
		all: unset;
		cursor: pointer;
		width: 26px;
		height: 26px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		color: var(--color-text-faint);
		transition: all 140ms;
	}

	.c-close:active {
		background: var(--color-bg-1);
		color: var(--color-text-muted);
	}

	.c-num-row {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 12px;
		padding: 4px 0 8px;
	}

	.c-bump {
		all: unset;
		cursor: pointer;
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: var(--color-bg-1);
		color: var(--color-text-muted);
		font-size: 18px;
		font-weight: 500;
		transition: all 140ms;
		align-self: center;
	}

	.c-bump:active {
		background: var(--ember-tint-bg);
		color: var(--color-ember-deep);
		transform: scale(0.93);
	}

	.c-input {
		all: unset;
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variation-settings:
			'opsz' 96,
			'SOFT' 90,
			'wght' 480;
		font-size: 60px;
		line-height: 0.92;
		letter-spacing: -0.04em;
		color: var(--color-text-primary);
		text-align: center;
		width: 4.5ch;
		caret-color: var(--color-ember);
	}

	.c-unit {
		font-family: var(--font-display);
		font-variation-settings:
			'opsz' 24,
			'SOFT' 90,
			'wght' 420;
		font-size: 16px;
		color: var(--color-text-subtle);
		align-self: baseline;
	}

	.c-actions {
		display: flex;
		gap: 8px;
		align-items: stretch;
	}

	.c-save,
	.c-save-full,
	.c-delete-confirm {
		all: unset;
		cursor: pointer;
		text-align: center;
		padding: 12px 18px;
		border-radius: 12px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-weight: 500;
		transition: all 140ms;
		flex: 1;
	}

	.c-save,
	.c-save-full {
		background: var(--color-ember);
		color: oklch(98% 0.008 70);
	}

	.c-save:active,
	.c-save-full:active {
		background: var(--color-ember-deep);
		transform: scale(0.985);
	}

	.c-delete {
		all: unset;
		cursor: pointer;
		width: 44px;
		display: grid;
		place-items: center;
		border-radius: 12px;
		color: var(--color-text-faint);
		background: var(--color-bg-1);
		transition: all 140ms;
		flex: none;
	}

	.c-delete:active {
		color: var(--color-overtarget);
		background: color-mix(in oklab, var(--color-overtarget) 10%, var(--color-bg-1));
	}

	.c-delete-confirm {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		background: var(--color-overtarget);
		color: oklch(98% 0.008 30);
	}

	.c-cancel {
		all: unset;
		cursor: pointer;
		padding: 12px 16px;
		border-radius: 12px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-muted);
		transition: all 140ms;
	}

	.c-cancel:active {
		background: var(--color-bg-1);
	}
</style>
