<script lang="ts">
	import { Trash2 } from '@lucide/svelte';
	import { BottomSheet } from '@nexo/ui';
	import { invalidateAll } from '$app/navigation';
	import UnitStepper from './UnitStepper.svelte';
	import MealSlotChip from './MealSlotChip.svelte';
	import type { Entry, Food, FoodUnit, MealSlot } from '$lib/types';
	import { m } from '$lib/paraglide/messages.js';

	let {
		open = $bindable(false),
		entry,
		foods = []
	}: {
		open?: boolean;
		entry: Entry | null;
		foods?: Food[];
	} = $props();

	let grams = $state(0);
	let mealSlot = $state<MealSlot | null>(null);

	const food = $derived(entry ? foods.find((f) => f.id === entry.foodId) : null);
	const units = $derived<FoodUnit[]>(food?.units ?? [{ id: 'g', gramsPerUnit: 1, default: true }]);

	$effect(() => {
		if (open && entry) {
			grams = entry.grams;
			mealSlot = entry.mealSlot ?? null;
		}
	});

	const live = $derived.by(() => {
		if (!food) return { kcal: 0, p: 0, c: 0, f: 0 };
		return {
			kcal: Math.round((food.per100.kcal * grams) / 100),
			p: Math.round(((food.per100.protein_g * grams) / 100) * 10) / 10,
			c: Math.round(((food.per100.carbs_g * grams) / 100) * 10) / 10,
			f: Math.round(((food.per100.fat_g * grams) / 100) * 10) / 10
		};
	});

	const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
	const slotLabels: Record<MealSlot, () => string> = {
		breakfast: m.meal_breakfast,
		lunch: m.meal_lunch,
		dinner: m.meal_dinner,
		snack: m.meal_snack
	};

	const time = $derived(
		entry
			? new Date(entry.loggedAt).toLocaleTimeString('en-US', {
					hour: '2-digit',
					minute: '2-digit',
					hour12: false
				})
			: ''
	);

	let busy = $state(false);

	async function save() {
		if (!entry || busy) return;
		busy = true;
		const form = new FormData();
		form.set('id', entry.id);
		form.set('grams', String(grams));
		form.set('unit', 'g');
		form.set('kcal', String(live.kcal));
		form.set('proteinG', String(live.p));
		form.set('carbsG', String(live.c));
		form.set('fatG', String(live.f));
		if (mealSlot) form.set('mealSlot', mealSlot);
		try {
			const res = await fetch('/?/editEntry', { method: 'POST', body: form });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			await invalidateAll();
			open = false;
		} catch (e) {
			console.error('editEntry failed', e);
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!entry || busy) return;
		busy = true;
		const form = new FormData();
		form.set('id', entry.id);
		try {
			const res = await fetch('/?/deleteEntry', { method: 'POST', body: form });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			await invalidateAll();
			open = false;
		} catch (e) {
			console.error('deleteEntry failed', e);
		} finally {
			busy = false;
		}
	}
</script>

<BottomSheet bind:open title={m.edit_entry_heading()} subtitle={entry?.foodName ?? ''}>
	{#if entry}
		<div class="edit">
			<div class="meta">
				<span class="time">{time}</span>
				{#if entry.mealSlot}
					<MealSlotChip slot={entry.mealSlot} />
				{/if}
			</div>

			<!-- Grams Stepper — primary edit -->
			<div class="grams-block">
				<span class="g-label">{m.add_grams_label()}</span>
				<UnitStepper bind:grams {units} ariaLabel="Amount" />
			</div>

			<!-- Live preview -->
			<div class="preview">
				<div class="p-kcal">
					<span class="p-num">{live.kcal}</span>
					<span class="p-unit">{m.unit_kcal()}</span>
				</div>
				<div class="p-macros">
					<div class="p-m" style="--c:var(--color-protein)">
						<span class="p-m-label">P</span>
						<span class="p-m-val">{live.p}g</span>
					</div>
					<div class="p-m" style="--c:var(--color-carbs)">
						<span class="p-m-label">C</span>
						<span class="p-m-val">{live.c}g</span>
					</div>
					<div class="p-m" style="--c:var(--color-fat)">
						<span class="p-m-label">F</span>
						<span class="p-m-val">{live.f}g</span>
					</div>
				</div>
			</div>

			<!-- Slot chooser -->
			<div class="slot-row">
				<span class="slot-label">{m.add_meal_slot()}</span>
				<div class="slot-pills">
					<button
						class="pill"
						class:on={mealSlot === null}
						type="button"
						onclick={() => (mealSlot = null)}
					>
						—
					</button>
					{#each slots as s (s)}
						<button
							class="pill"
							class:on={mealSlot === s}
							type="button"
							onclick={() => (mealSlot = s)}
						>
							{slotLabels[s]()}
						</button>
					{/each}
				</div>
			</div>

			<!-- Action bar -->
			<div class="actions">
				<button class="delete-btn" type="button" onclick={remove} aria-label={m.action_delete()}>
					<Trash2 size={15} strokeWidth={1.7} />
					<span>{m.action_delete()}</span>
				</button>
				<button class="save-btn" type="button" onclick={save}>
					<span>{m.action_save()}</span>
					<span class="save-num">{live.kcal} {m.unit_kcal()}</span>
				</button>
			</div>
		</div>
	{/if}
</BottomSheet>

<style>
	.edit {
		display: flex;
		flex-direction: column;
		gap: 18px;
		padding: 4px 0 8px;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.time {
		font-family: var(--font-mono);
		font-size: 11px;
		font-feature-settings: 'tnum' 1;
		color: var(--color-text-faint);
		letter-spacing: 0.04em;
	}

	.grams-block {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.g-label {
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
		font-weight: 500;
	}

	.preview {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px 16px;
		background: color-mix(in oklab, var(--color-ember) 5%, var(--color-bg-1));
		border-radius: 14px;
	}

	.p-kcal {
		display: flex;
		align-items: baseline;
		gap: 4px;
	}

	.p-num {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1;
		font-variation-settings:
			'opsz' 96,
			'SOFT' 80,
			'wght' 500;
		font-size: 32px;
		line-height: 1;
		letter-spacing: -0.03em;
		color: var(--color-text-primary);
	}

	.p-unit {
		font-size: 11px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}

	.p-macros {
		display: flex;
		gap: 12px;
	}

	.p-m {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.p-m-label {
		font-size: 9.5px;
		letter-spacing: 0.16em;
		color: var(--c);
		font-weight: 600;
	}

	.p-m-val {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1;
		font-variation-settings:
			'opsz' 24,
			'wght' 480;
		font-size: 13px;
		color: var(--color-text-primary);
	}

	.slot-row {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.slot-label {
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
		font-weight: 500;
	}

	.slot-pills {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.slot-pills::-webkit-scrollbar {
		display: none;
	}

	.pill {
		all: unset;
		cursor: pointer;
		padding: 6px 12px;
		border-radius: 999px;
		font-size: 12px;
		color: var(--color-text-muted);
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		flex-shrink: 0;
		transition: all 160ms;
	}

	.pill.on {
		background: var(--color-text-primary);
		border-color: var(--color-text-primary);
		color: var(--color-bg-0);
	}

	.actions {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 8px;
		padding-top: 6px;
	}

	.delete-btn {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 14px 18px;
		border-radius: 14px;
		background: transparent;
		border: 1px solid var(--color-border-default);
		color: var(--color-overtarget);
		font-size: 13px;
		transition: all 160ms;
	}

	.delete-btn:active {
		background: color-mix(in oklab, var(--color-overtarget) 8%, transparent);
	}

	.save-btn {
		all: unset;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px 22px;
		background: var(--color-ember);
		color: oklch(98% 0.008 70);
		border-radius: 14px;
		font-size: 14.5px;
		font-weight: 500;
		letter-spacing: -0.005em;
		transition:
			background 160ms,
			transform 120ms;
	}

	.save-btn:active {
		transform: scale(0.99);
		background: var(--color-ember-deep);
	}

	.save-num {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1;
		font-variation-settings:
			'opsz' 24,
			'wght' 460;
		opacity: 0.92;
	}
</style>
