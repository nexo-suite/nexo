<script lang="ts">
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { BottomSheet } from '@nexo/ui';
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import type { WeightPoint } from '$lib/utils/weightStats';
	import { m } from '$lib/paraglide/messages.js';

	let {
		open = $bindable(false),
		latestKg,
		weights
	}: {
		open?: boolean;
		latestKg: number | null;
		weights: WeightPoint[];
	} = $props();

	const MS_PER_DAY = 24 * 60 * 60 * 1000;
	const todayIso = new Date().toISOString().slice(0, 10);
	const earliestIso = new Date(Date.now() - 7 * MS_PER_DAY).toISOString().slice(0, 10);

	let selectedDate = $state(todayIso);
	let kg = $state(untrack(() => latestKg ?? 75));

	$effect(() => {
		if (open) {
			selectedDate = todayIso;
		}
	});

	$effect(() => {
		const existing = weights.find((w) => w.date === selectedDate);
		kg = existing ? existing.kg : (latestKg ?? 75);
	});

	function shiftDay(delta: -1 | 1) {
		const ms = Date.parse(`${selectedDate}T00:00:00Z`) + delta * MS_PER_DAY;
		const next = new Date(ms).toISOString().slice(0, 10);
		if (next > todayIso || next < earliestIso) return;
		selectedDate = next;
	}

	const dateLabel = $derived.by(() => {
		if (selectedDate === todayIso) return m.weight_date_today();
		const yesterday = new Date(Date.now() - MS_PER_DAY).toISOString().slice(0, 10);
		if (selectedDate === yesterday) return m.weight_date_yesterday();
		const d = new Date(`${selectedDate}T00:00:00Z`);
		return new Intl.DateTimeFormat('en', {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		}).format(d);
	});

	const canStepBack = $derived(selectedDate > earliestIso);
	const canStepForward = $derived(selectedDate < todayIso);

	function bumpKg(delta: number) {
		kg = Math.max(20, Math.min(400, Math.round((kg + delta) * 10) / 10));
	}
</script>

<BottomSheet bind:open title={m.weight_log_sheet_title()}>
	<form
		class="log-form"
		method="POST"
		action="/weight?/logWeight"
		use:enhance={() => {
			return async ({ update }) => {
				await update();
				open = false;
			};
		}}
	>
		<input type="hidden" name="date" value={selectedDate} />
		<input type="hidden" name="kg" value={kg.toFixed(1)} />

		<div class="date-row">
			<button
				type="button"
				class="d-step"
				disabled={!canStepBack}
				onclick={() => shiftDay(-1)}
				aria-label="Earlier day"
			>
				<ChevronLeft size={16} strokeWidth={1.8} />
			</button>
			<span class="d-label">{dateLabel}</span>
			<button
				type="button"
				class="d-step"
				disabled={!canStepForward}
				onclick={() => shiftDay(1)}
				aria-label="Later day"
			>
				<ChevronRight size={16} strokeWidth={1.8} />
			</button>
		</div>

		<div class="big-num">
			<button type="button" class="bn-step" onclick={() => bumpKg(-0.1)} aria-label="Down">−</button>
			<input
				class="bn-input tnum"
				type="number"
				inputmode="decimal"
				step="0.1"
				min="20"
				max="400"
				bind:value={kg}
			/>
			<button type="button" class="bn-step" onclick={() => bumpKg(0.1)} aria-label="Up">+</button>
		</div>
		<div class="bn-unit-row">
			<span class="bn-unit">kg</span>
		</div>

		<button class="confirm" type="submit">{m.action_save()}</button>
	</form>
</BottomSheet>

<style>
	.log-form {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 4px 0 12px;
	}

	.date-row {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 14px;
		padding: 4px 0;
	}

	.d-step {
		all: unset;
		cursor: pointer;
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: var(--ember-tint-bg);
		color: var(--color-ember-deep);
		transition:
			background 140ms,
			transform 100ms;
	}

	.d-step:active {
		background: color-mix(in oklab, var(--color-ember) 14%, var(--color-bg-0));
		transform: scale(0.93);
	}

	.d-step:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.d-label {
		font-family: var(--font-display);
		font-style: italic;
		font-variation-settings: 'opsz' 24, 'SOFT' 100, 'wght' 440, 'ital' 1;
		font-size: 16px;
		color: var(--color-text-muted);
		min-width: 12ch;
		text-align: center;
		letter-spacing: -0.005em;
	}

	.big-num {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 14px;
		padding: 16px 0 0;
	}

	.bn-step {
		all: unset;
		cursor: pointer;
		width: 36px;
		height: 36px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: var(--color-bg-1);
		color: var(--color-text-muted);
		font-size: 18px;
		font-weight: 500;
		transition: all 140ms;
	}

	.bn-step:active {
		background: var(--ember-tint-bg);
		color: var(--color-ember-deep);
		transform: scale(0.93);
	}

	.bn-input {
		all: unset;
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variation-settings: 'opsz' 144, 'SOFT' 90, 'wght' 480;
		font-size: 78px;
		line-height: 0.92;
		letter-spacing: -0.04em;
		color: var(--color-text-primary);
		text-align: center;
		width: 5ch;
		caret-color: var(--color-ember);
	}

	.bn-unit-row {
		display: flex;
		justify-content: center;
		margin-top: -4px;
	}

	.bn-unit {
		font-family: var(--font-display);
		font-variation-settings: 'opsz' 24, 'SOFT' 90, 'wght' 420;
		font-size: 16px;
		color: var(--color-text-subtle);
	}

	.confirm {
		all: unset;
		cursor: pointer;
		padding: 16px 22px;
		text-align: center;
		background: var(--color-ember);
		color: oklch(98% 0.008 70);
		border-radius: 16px;
		font-size: 15px;
		font-weight: 500;
		margin-top: 8px;
	}
</style>
