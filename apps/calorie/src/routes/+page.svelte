<script lang="ts">
	import { Plus, EyeOff } from '@lucide/svelte';
	import { PageHeader } from '@nexo/ui';
	import KcalRing from '$lib/components/KcalRing.svelte';
	import MacroBar from '$lib/components/MacroBar.svelte';
	import MealSection from '$lib/components/MealSection.svelte';
	import DateStrip from '$lib/components/DateStrip.svelte';
	import AddEntrySheet from '$lib/components/AddEntrySheet.svelte';
	import EditEntrySheet from '$lib/components/EditEntrySheet.svelte';
	import InlineAddPanel from '$lib/components/InlineAddPanel.svelte';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import type { Entry, MealSlot, Moment } from '$lib/types';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageData } from './$types';
	import { slotTargets as computeSlotTargets, tierShowsFiber, tierShowsSugar } from '$lib/calc';

	let { data }: { data: PageData } = $props();

	const profile = $derived(data.profile);
	const targets = $derived(data.targets);
	const todayEntries = $derived<Entry[]>(data.todayEntries);
	const todayMoments = $derived<Moment[]>(data.todayMoments);

	let selectedDay = $state(new Date());
	let addOpen = $state(false);
	let preselectedSlot = $state<MealSlot | null>(null);
	let editOpen = $state(false);
	let editingEntry = $state<Entry | null>(null);
	let showEmpty = $state(false);
	// Slot whose inline add panel is currently expanded; null when no panel is open.
	let openSlot = $state<MealSlot | null>(null);

	const consumed = $derived.by(() => {
		if (showEmpty) return { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 };
		return todayEntries.reduce(
			(acc, e) => ({
				kcal: acc.kcal + e.kcal,
				protein_g: acc.protein_g + e.protein_g,
				carbs_g: acc.carbs_g + e.carbs_g,
				fat_g: acc.fat_g + e.fat_g,
				fiber_g: acc.fiber_g + (e.fiber_g ?? 0)
			}),
			{ kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
		);
	});

	const showFiber = $derived(tierShowsFiber(profile.tier));
	const showSugar = $derived(tierShowsSugar(profile.tier));

	const slotOrder: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

	function guessSlot(hour: number): MealSlot {
		if (hour < 11) return 'breakfast';
		if (hour < 15) return 'lunch';
		if (hour < 21) return 'dinner';
		return 'snack';
	}

	const entriesBySlot = $derived.by<Record<MealSlot, Entry[]>>(() => {
		const buckets: Record<MealSlot, Entry[]> = {
			breakfast: [],
			lunch: [],
			dinner: [],
			snack: []
		};
		if (showEmpty) return buckets;
		for (const e of todayEntries) {
			const slot: MealSlot = e.mealSlot ?? guessSlot(new Date(e.loggedAt).getHours());
			buckets[slot].push(e);
		}
		return buckets;
	});

	const momentsBySlot = $derived.by<Record<MealSlot, Moment[]>>(() => {
		const buckets: Record<MealSlot, Moment[]> = {
			breakfast: [],
			lunch: [],
			dinner: [],
			snack: []
		};
		if (showEmpty) return buckets;
		const hasAnyEntries = todayEntries.length > 0;
		for (const moment of todayMoments) {
			if (moment.kind === 'first_of_day' && hasAnyEntries) continue;
			if (!moment.at) {
				buckets.breakfast.push(moment);
				continue;
			}
			const slot: MealSlot = guessSlot(new Date(moment.at).getHours());
			buckets[slot].push(moment);
		}
		return buckets;
	});

	const dayBookends = $derived.by(() => {
		if (showEmpty || todayEntries.length === 0) return null;
		const sorted = [...todayEntries].sort(
			(a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
		);
		const fmt = (iso: string) =>
			new Date(iso).toLocaleTimeString('en-US', {
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			});
		return {
			first: fmt(sorted[0].loggedAt),
			latest: fmt(sorted[sorted.length - 1].loggedAt)
		};
	});

	const slotTargetsMap = $derived(computeSlotTargets(targets.kcal));

	function openAdd(slot?: MealSlot) {
		preselectedSlot = slot ?? null;
		addOpen = true;
	}

	function toggleSlotPanel(slot: MealSlot) {
		// Single panel at a time; tapping the same slot twice closes it.
		openSlot = openSlot === slot ? null : slot;
	}

	function closeSlotPanel() {
		openSlot = null;
	}

	function buildMealForSlot(slot: MealSlot) {
		// "Build a meal here →" path — collapse inline panel, open the modal builder.
		openSlot = null;
		preselectedSlot = slot;
		addOpen = true;
	}

	function openEdit(entry: Entry) {
		editingEntry = entry;
		editOpen = true;
	}
</script>

<div class="page">
	<PageHeader title={m.app_name()} subtitle={m.app_tagline()}>
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
		{#snippet actions()}
			<button
				class="icon-btn ghost"
				type="button"
				onclick={() => (showEmpty = !showEmpty)}
				aria-label="Demo toggle"
			>
				<EyeOff size={16} strokeWidth={1.6} />
			</button>
			<button
				class="icon-btn primary"
				type="button"
				onclick={() => openAdd()}
				aria-label={m.action_log_food()}
			>
				<Plus size={18} strokeWidth={2} />
			</button>
		{/snippet}
	</PageHeader>

	<DateStrip bind:selected={selectedDay} />

	{#if showEmpty}
		<section class="empty">
			<div class="empty-illustration" aria-hidden="true">
				<svg viewBox="0 0 120 120" width="100" height="100">
					<circle
						cx="60"
						cy="60"
						r="48"
						fill="none"
						stroke="var(--color-border-default)"
						stroke-width="1.5"
						stroke-dasharray="2 4"
					/>
					<circle cx="60" cy="60" r="3" fill="var(--color-ember-soft)" />
				</svg>
			</div>
			<h2 class="empty-title serif">{m.today_empty_heading()}</h2>
			<p class="empty-body">{m.today_empty_body()}</p>
			<button class="empty-cta" type="button" onclick={() => openAdd()}>
				<Plus size={16} strokeWidth={2} />
				{m.action_log_food()}
			</button>
		</section>
	{:else}
		<section class="ring-section">
			<div class="ring-triptych">
				{#if dayBookends}
					<div class="bookend left" aria-hidden="true">
						<span class="be-time">{dayBookends.first}</span>
						<span class="be-rule"></span>
						<span class="be-label">started</span>
					</div>
				{:else}
					<div class="bookend left placeholder" aria-hidden="true"></div>
				{/if}

				<KcalRing consumed={consumed.kcal} target={targets.kcal} size={216} />

				{#if dayBookends}
					<div class="bookend right" aria-hidden="true">
						<span class="be-label">latest</span>
						<span class="be-rule"></span>
						<span class="be-time">{dayBookends.latest}</span>
					</div>
				{:else}
					<div class="bookend right placeholder" aria-hidden="true"></div>
				{/if}
			</div>
		</section>

		<section class="macros">
			<MacroBar
				label={m.macro_protein()}
				consumed={consumed.protein_g}
				target={targets.protein_g}
				colorVar="--color-protein"
			/>
			<MacroBar
				label={m.macro_carbs()}
				consumed={consumed.carbs_g}
				target={targets.carbs_g}
				colorVar="--color-carbs"
			/>
			<MacroBar
				label={m.macro_fat()}
				consumed={consumed.fat_g}
				target={targets.fat_g}
				colorVar="--color-fat"
			/>
			{#if showFiber}
				<MacroBar
					label={m.macro_fiber()}
					consumed={consumed.fiber_g}
					target={targets.fiber_g ?? 30}
					colorVar="--color-fiber"
				/>
			{/if}
			{#if showSugar}
				<MacroBar
					label={m.macro_sugar()}
					consumed={Math.round(consumed.carbs_g * 0.4)}
					target={targets.sugar_g ?? 50}
					colorVar="--color-sugar"
				/>
			{/if}
		</section>

		<div class="rule" aria-hidden="true">
			<span class="rule-line"></span>
			<span class="rule-label">{m.today_section_timeline()}</span>
			<span class="rule-line"></span>
		</div>

		<section class="sections">
			{#each slotOrder as slot (slot)}
				<MealSection
					{slot}
					entries={entriesBySlot[slot]}
					moments={momentsBySlot[slot]}
					target={slotTargetsMap[slot]}
					panelOpen={openSlot === slot}
					onAdd={toggleSlotPanel}
					onEntryTap={openEdit}
				>
					{#snippet addPanel()}
						<InlineAddPanel
							mealSlot={slot}
							foods={data.foods}
							favoriteIds={data.favoriteIds}
							recentIds={data.recentFoodIds}
							tier={profile.tier}
							onClose={closeSlotPanel}
							onBuildMeal={buildMealForSlot}
						/>
					{/snippet}
				</MealSection>
			{/each}
		</section>
	{/if}
</div>

<AddEntrySheet
	bind:open={addOpen}
	initialSlot={preselectedSlot}
	foods={data.foods}
	favoriteIds={data.favoriteIds}
	recentIds={data.recentFoodIds}
	savedMeals={data.savedMeals}
/>
<EditEntrySheet bind:open={editOpen} entry={editingEntry} foods={data.foods} />

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 22px;
		padding: 12px 16px 28px;
		position: relative;
		z-index: 1;
	}

	.icon-btn {
		all: unset;
		cursor: pointer;
		width: 36px;
		height: 36px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		transition:
			background 160ms,
			transform 120ms;
	}

	.icon-btn.ghost {
		color: var(--color-text-subtle);
		background: var(--color-bg-1);
	}

	.icon-btn.primary {
		color: oklch(98% 0.008 70);
		background: var(--color-ember);
		box-shadow: 0 4px 12px -4px var(--color-ember-deep);
	}

	.icon-btn.primary:active {
		transform: scale(0.94);
		background: var(--color-ember-deep);
	}

	.ring-section {
		display: flex;
		justify-content: center;
		padding: 4px 0 0;
	}

	.ring-triptych {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 8px;
		width: 100%;
		max-width: 460px;
		position: relative;
	}

	/* Soft bloom behind the ring — fills the empty space without info-clutter */
	.ring-triptych::before {
		content: '';
		position: absolute;
		left: 50%;
		top: 50%;
		width: 80%;
		height: 80%;
		transform: translate(-50%, -50%);
		background: radial-gradient(
			ellipse at center,
			color-mix(in oklab, var(--color-ember) 7%, transparent),
			transparent 60%
		);
		pointer-events: none;
		z-index: 0;
	}

	.bookend {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		min-width: 0;
		opacity: 0.85;
		z-index: 1;
		animation: bookend-fade 700ms cubic-bezier(0.32, 0.72, 0, 1) both;
		animation-delay: 240ms;
	}

	.bookend.left {
		align-items: flex-end;
	}

	.bookend.right {
		align-items: flex-start;
	}

	.bookend.placeholder {
		visibility: hidden;
	}

	@keyframes bookend-fade {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 0.85;
			transform: translateY(0);
		}
	}

	.be-time {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1;
		font-variation-settings:
			'opsz' 36,
			'SOFT' 70,
			'wght' 460;
		font-size: 17px;
		letter-spacing: -0.015em;
		color: var(--color-text-muted);
		line-height: 1;
	}

	.be-rule {
		display: block;
		width: 18px;
		height: 1px;
		background: var(--color-border-strong);
		opacity: 0.6;
	}

	.be-label {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}

	.macros {
		display: grid;
		grid-template-columns: 1fr 1fr;
		column-gap: 24px;
		row-gap: 14px;
		padding: 4px 4px 0;
	}

	.rule {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 4px 4px;
	}

	.rule-line {
		flex: 1;
		height: 1px;
		background: var(--color-border-subtle);
	}

	.rule-label {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}

	.sections {
		display: flex;
		flex-direction: column;
		gap: 26px;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		padding: 60px 20px;
		text-align: center;
	}

	.empty-illustration {
		opacity: 0.7;
		margin-bottom: 8px;
	}

	.empty-title {
		font-family: var(--font-display);
		font-variation-settings:
			'opsz' 60,
			'SOFT' 80,
			'wght' 460;
		font-size: 30px;
		line-height: 1;
		letter-spacing: -0.025em;
		color: var(--color-text-primary);
		margin: 0;
	}

	.empty-body {
		font-size: 14px;
		color: var(--color-text-subtle);
		margin: 0;
		max-width: 240px;
	}

	.empty-cta {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 12px 22px;
		border-radius: 999px;
		background: var(--color-text-primary);
		color: var(--color-bg-0);
		font-size: 14px;
		font-weight: 500;
		margin-top: 6px;
	}
</style>
