<script lang="ts">
	import { Plus, ScrollText } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { GreetingHeader, useNow } from '@nexo/ui';
	import KcalRing from '$lib/components/KcalRing.svelte';
	import MacroBar from '$lib/components/MacroBar.svelte';
	import MealSection from '$lib/components/MealSection.svelte';
	import DateStrip from '$lib/components/DateStrip.svelte';
	import DiaryView from '$lib/components/DiaryView.svelte';
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

	const todayIso = localIso(new Date());

	// Tracks the date currently shown — writable derived re-syncs whenever the URL/load changes,
	// while DateStrip's bind:selected can momentarily override it during navigation.
	let selectedDay = $derived(new Date((data.selectedIso ?? todayIso) + 'T12:00:00'));

	function localIso(d: Date): string {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	function handleDateSelect(d: Date) {
		const iso = localIso(d);
		goto(iso === todayIso ? '/' : `/?date=${iso}`);
	}

	const pageTitle = $derived.by(() => {
		const iso = data.selectedIso;
		if (iso === todayIso) return capitalize(m.weight_date_today());
		const today = new Date();
		const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
		if (iso === localIso(yesterday)) return capitalize(m.weight_date_yesterday());
		const d = new Date(iso + 'T12:00:00');
		return new Intl.DateTimeFormat('en', {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		}).format(d);
	});

	function capitalize(s: string) {
		return s ? s[0].toUpperCase() + s.slice(1) : s;
	}
	let addOpen = $state(false);
	let preselectedSlot = $state<MealSlot | null>(null);
	let editOpen = $state(false);
	let editingEntry = $state<Entry | null>(null);
	// Diary view: chronological flat ledger instead of meal-grouped sections.
	// The toggle persists for the session so flipping between today/history doesn't reset it.
	let diaryMode = $state(false);
	$effect(() => {
		if (typeof window === 'undefined') return;
		const stored = sessionStorage.getItem('calorie:diary-mode');
		if (stored === '1') diaryMode = true;
	});
	function toggleDiary() {
		diaryMode = !diaryMode;
		if (typeof window !== 'undefined') {
			sessionStorage.setItem('calorie:diary-mode', diaryMode ? '1' : '0');
		}
	}
	// Slot whose inline add panel is currently expanded; null when no panel is open.
	let openSlot = $state<MealSlot | null>(null);

	const consumed = $derived.by(() => {
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

	const displayName = $derived(data.user?.name?.split(' ')[0] || 'there');
	const clock = useNow();
	const timeLabel = $derived(
		clock.value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
	);
	const greetDetails = $derived.by<string[]>(() => {
		const items: string[] = [timeLabel];
		const consumedKcal = Math.round(consumed.kcal);
		const targetKcal = targets.kcal;
		if (targetKcal > 0) {
			items.push(`${consumedKcal} / ${targetKcal} kcal`);
			if (consumedKcal === 0) items.push('untouched');
			else if (consumedKcal >= targetKcal) items.push('over target');
			else items.push(`${Math.round((consumedKcal / targetKcal) * 100)}% of target`);
		} else {
			items.push(`${consumedKcal} kcal`);
		}
		return items;
	});

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
		if (todayEntries.length === 0) return null;
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

	const visibleMoments = $derived.by(() => {
		const hasAnyEntries = todayEntries.length > 0;
		return todayMoments.filter((mo) => !(mo.kind === 'first_of_day' && hasAnyEntries));
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
	<GreetingHeader name={displayName} eyebrow={pageTitle} details={greetDetails}>
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
		{#snippet actions()}
			<button
				class="icon-btn ghost"
				class:on={diaryMode}
				type="button"
				onclick={toggleDiary}
				aria-label={m.action_toggle_diary()}
				aria-pressed={diaryMode}
			>
				<ScrollText size={16} strokeWidth={1.7} />
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
	</GreetingHeader>

	<DateStrip bind:selected={selectedDay} onSelect={handleDateSelect} />

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

	{#if diaryMode}
		<DiaryView
			entries={todayEntries}
			moments={visibleMoments}
			onEntryTap={openEdit}
			onAdd={() => openAdd()}
		/>
	{:else}
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
							savedMeals={data.savedMeals}
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
		transition:
			background 200ms,
			color 200ms,
			box-shadow 240ms;
	}

	.icon-btn.ghost.on {
		color: var(--color-ember-deep);
		background: var(--ember-tint-bg);
		box-shadow:
			inset 0 0 0 1px var(--ember-line),
			0 0 0 3px color-mix(in oklab, var(--color-ember) 8%, transparent);
	}

	.icon-btn.ghost:active {
		transform: scale(0.94);
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
</style>
