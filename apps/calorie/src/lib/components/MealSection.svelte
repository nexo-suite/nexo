<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import type { Entry, MealSlot, Moment } from '$lib/types';
	import TimelineRow from './TimelineRow.svelte';
	import MealGroup from './MealGroup.svelte';
	import MomentCard from './Moment.svelte';
	import { m } from '$lib/paraglide/messages.js';

	let {
		slot,
		entries,
		moments = [],
		target,
		panelOpen = false,
		onAdd,
		onEntryTap,
		addPanel
	}: {
		slot: MealSlot;
		entries: Entry[];
		moments?: Moment[];
		target: number;
		panelOpen?: boolean;
		onAdd?: (slot: MealSlot) => void;
		onEntryTap?: (entry: Entry) => void;
		addPanel?: Snippet;
	} = $props();

	const slotMeta: Record<MealSlot, { num: string; label: () => string; colorVar: string }> = {
		breakfast: { num: '01', label: m.meal_breakfast, colorVar: '--color-slot-breakfast' },
		lunch: { num: '02', label: m.meal_lunch, colorVar: '--color-slot-lunch' },
		dinner: { num: '03', label: m.meal_dinner, colorVar: '--color-slot-dinner' },
		snack: { num: '04', label: m.meal_snack, colorVar: '--color-slot-snack' }
	};

	const meta = $derived(slotMeta[slot]);

	const subtotal = $derived(Math.round(entries.reduce((s, e) => s + e.kcal, 0)));
	const pct = $derived(target > 0 ? Math.min(100, (subtotal / target) * 100) : 0);
	const isOver = $derived(subtotal > target);

	// Group entries by mealId — items sharing a mealId render as a single MealGroup
	type Item =
		| { kind: 'single'; entry: Entry }
		| { kind: 'group'; entries: Entry[]; mealId: string }
		| { kind: 'moment'; moment: Moment };

	const items = $derived.by<Item[]>(() => {
		const groups = new Map<string, Entry[]>();
		const singles: Entry[] = [];
		for (const e of entries) {
			if (e.mealId) {
				const arr = groups.get(e.mealId) ?? [];
				arr.push(e);
				groups.set(e.mealId, arr);
			} else {
				singles.push(e);
			}
		}

		const composed: Item[] = [];
		for (const [mealId, arr] of groups) {
			composed.push({ kind: 'group', entries: arr, mealId });
		}
		for (const e of singles) {
			composed.push({ kind: 'single', entry: e });
		}
		for (const mom of moments) {
			composed.push({ kind: 'moment', moment: mom });
		}

		// Sort by timestamp
		const stamp = (it: Item): number => {
			if (it.kind === 'single') return new Date(it.entry.loggedAt).getTime();
			if (it.kind === 'group') return new Date(it.entries[0].loggedAt).getTime();
			return it.moment.at ? new Date(it.moment.at).getTime() : 0;
		};
		return composed.sort((a, b) => stamp(a) - stamp(b));
	});

	const isEmpty = $derived(entries.length === 0 && moments.length === 0);
</script>

<section class="section" style:--slot-c="var({meta.colorVar})">
	<header class="head">
		<div class="title-block">
			<span class="num eyebrow-num">{meta.num} —</span>
			<span class="label serif-display">{meta.label()}</span>
		</div>
		<div class="meta">
			<span class="count tnum">
				{entries.length}
				{entries.length === 1 ? 'item' : 'items'}
			</span>
			<span class="dot-sep" aria-hidden="true">·</span>
			<span class="subtotal tnum">
				{subtotal}<span class="sub-target"> / {target}</span>
			</span>
		</div>
		<button
			class="add-btn"
			type="button"
			onclick={() => onAdd?.(slot)}
			aria-label="Add to {meta.label()}"
		>
			<Plus size={14} strokeWidth={2} />
		</button>
	</header>

	<div class="progress" aria-hidden="true">
		<span class="progress-fill" class:over={isOver} style:width="{pct}%"></span>
	</div>

	{#if !isEmpty}
		<div class="items">
			{#each items as item, i (i)}
				{#if item.kind === 'single'}
					<TimelineRow entry={item.entry} onclick={onEntryTap} />
				{:else if item.kind === 'group'}
					<MealGroup entries={item.entries} mealId={item.mealId} onEntryTap={onEntryTap} />
				{:else}
					<MomentCard moment={item.moment} />
				{/if}
			{/each}
		</div>
	{/if}

	{#if !panelOpen}
		<button
			class="add-row"
			class:placeholder-state={isEmpty}
			type="button"
			onclick={() => onAdd?.(slot)}
		>
			<Plus size={13} strokeWidth={1.7} />
			<span class="add-row-label">{m.add_to_slot()} {meta.label()}</span>
		</button>
	{:else if addPanel}
		{@render addPanel()}
	{/if}
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.head {
		display: flex;
		align-items: baseline;
		gap: 10px;
		padding: 0 4px;
	}

	.title-block {
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
		flex: 0 0 auto;
	}

	.num {
		opacity: 0.7;
	}

	.label {
		font-size: 18px;
		font-variation-settings: 'opsz' 36, 'SOFT' 100, 'wght' 470;
		color: var(--color-text-primary);
	}

	.meta {
		flex: 1;
		display: flex;
		align-items: baseline;
		gap: 6px;
		font-size: 11px;
		color: var(--color-text-faint);
		font-feature-settings: 'tnum' 1;
		min-width: 0;
		justify-content: flex-end;
	}

	.dot-sep {
		opacity: 0.5;
	}

	.subtotal {
		font-family: var(--font-display);
		font-variation-settings: 'opsz' 24, 'wght' 460;
		color: var(--color-text-subtle);
	}

	.sub-target {
		opacity: 0.5;
	}

	.add-btn {
		all: unset;
		cursor: pointer;
		width: 26px;
		height: 26px;
		border-radius: 999px;
		background: var(--ember-tint-bg);
		color: var(--color-ember-deep);
		display: grid;
		place-items: center;
		flex-shrink: 0;
		transition:
			background 160ms,
			transform 120ms;
	}

	.add-btn:active {
		transform: scale(0.92);
		background: color-mix(in oklab, var(--color-ember) 16%, var(--color-bg-0));
	}

	.progress {
		height: 2px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--slot-c) 12%, var(--color-bg-1));
		overflow: hidden;
		margin: 0 4px;
	}

	.progress-fill {
		display: block;
		height: 100%;
		background: var(--slot-c);
		transition: width 640ms cubic-bezier(0.32, 0.72, 0, 1);
	}

	.progress-fill.over {
		background: var(--color-overtarget);
	}

	.items {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.add-row {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 10px 4px;
		margin-top: 2px;
		font-size: 12px;
		color: var(--color-text-faint);
		transition: color 160ms;
	}

	.add-row:hover {
		color: var(--color-ember-deep);
	}

	.add-row.placeholder-state {
		display: grid;
		grid-template-columns: 14px 1fr;
		justify-items: center;
		padding: 14px 18px;
		margin: 4px 4px 0;
		border: 1px dashed var(--color-border-default);
		border-radius: 12px;
		justify-content: center;
		font-style: italic;
		font-family: var(--font-display);
		font-variation-settings: 'opsz' 18, 'SOFT' 100, 'wght' 400, 'ital' 1;
	}

	.add-row.placeholder-state:hover {
		border-color: var(--ember-line);
	}

	.add-row-label {
		font-feature-settings: 'tnum' 0;
	}
</style>
