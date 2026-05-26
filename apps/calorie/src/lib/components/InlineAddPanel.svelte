<script lang="ts">
	import { Search, Barcode, X, Plus, Check, HelpCircle, Layers, Star } from '@lucide/svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import UnitStepper from './UnitStepper.svelte';
	import CreateFoodSheet from './CreateFoodSheet.svelte';
	import type { Food, FoodUnit, MacroTier, MealSlot } from '$lib/types';
	import { m } from '$lib/paraglide/messages.js';

	type SearchSource = 'user' | 'cache' | 'seed' | 'off';
	type SearchResult = {
		id: string;
		source: SearchSource;
		name: string;
		brand: string | null;
		kcal100g: number | null;
		protein100g: number | null;
		carbs100g: number | null;
		fat100g: number | null;
		fiber100g: number | null;
		sugars100g: number | null;
		nutriScoreGrade: string | null;
		servingSizeG: number | null;
	};

	let {
		mealSlot,
		foods = [],
		favoriteIds = [],
		recentIds = [],
		tier = 'extended',
		onClose,
		onBuildMeal
	}: {
		mealSlot: MealSlot;
		foods?: Food[];
		favoriteIds?: string[];
		recentIds?: string[];
		tier?: MacroTier;
		onClose: () => void;
		onBuildMeal: (slot: MealSlot) => void;
	} = $props();

	const slotLabels: Record<MealSlot, () => string> = {
		breakfast: m.meal_breakfast,
		lunch: m.meal_lunch,
		dinner: m.meal_dinner,
		snack: m.meal_snack
	};

	const sourceLabel: Record<SearchSource, () => string> = {
		user: m.source_own,
		cache: m.source_recent,
		seed: m.source_common,
		off: m.source_off
	};

	let query = $state('');
	let serverResults = $state<SearchResult[] | null>(null);
	let searching = $state(false);
	let globalError = $state(false);
	let hasMore = $state(false);
	let globalSearched = $state(false);
	let aborter: AbortController | null = null;
	let debounceHandle: ReturnType<typeof setTimeout> | null = null;
	let legendOpen = $state(false);

	let pendingFoodId = $state<string | null>(null);
	let pendingGrams = $state(100);
	let saving = $state(false);
	let toast = $state<string | null>(null);
	let toastHandle: ReturnType<typeof setTimeout> | null = null;

	// Custom-food creation lives in the CreateFoodSheet (bottom sheet) — this panel
	// just opens it and absorbs the result.
	let createOpen = $state(false);
	let createdFoods = $state<Food[]>([]);

	let panelEl: HTMLElement | null = $state(null);
	let inputEl: HTMLInputElement | null = $state(null);

	$effect(() => {
		// Auto-scroll panel into view on mount; auto-focus input.
		if (panelEl) {
			setTimeout(() => {
				panelEl?.scrollIntoView({ block: 'center', behavior: 'smooth' });
				inputEl?.focus();
			}, 150);
		}
	});

	$effect(() => {
		const q = query.trim();
		if (debounceHandle) clearTimeout(debounceHandle);
		if (aborter) {
			aborter.abort();
			aborter = null;
		}
		if (q.length < 3) {
			serverResults = null;
			searching = false;
			globalError = false;
			hasMore = false;
			globalSearched = false;
			return;
		}
		debounceHandle = setTimeout(() => runSearch(q, false), 450);
		return () => {
			if (debounceHandle) clearTimeout(debounceHandle);
		};
	});

	async function runSearch(q: string, global: boolean) {
		const ac = new AbortController();
		aborter = ac;
		searching = true;
		globalError = false;
		try {
			const url = `/api/foods/search?q=${encodeURIComponent(q)}${global ? '&global=1' : ''}`;
			const res = await fetch(url, { signal: ac.signal });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const body = (await res.json()) as {
				results: SearchResult[];
				hasMore: boolean;
				globalError: boolean;
			};
			if (ac.signal.aborted) return;
			serverResults = body.results;
			hasMore = body.hasMore;
			globalError = body.globalError;
			if (global) globalSearched = true;
		} catch (e) {
			if ((e as Error).name === 'AbortError') return;
			console.error('search failed', e);
			globalError = true;
		} finally {
			if (aborter === ac) {
				aborter = null;
				searching = false;
			}
		}
	}

	function expandGlobal() {
		const q = query.trim();
		if (q.length < 3) return;
		runSearch(q, true);
	}

	const recents = $derived(
		recentIds.map((id) => foods.find((f) => f.id === id)).filter((x): x is Food => x != null)
	);
	const favorites = $derived(
		favoriteIds.map((id) => foods.find((f) => f.id === id)).filter((x): x is Food => x != null)
	);

	function resultToFood(r: SearchResult): Food {
		return {
			id: r.id,
			name: r.name,
			brand: r.brand ?? undefined,
			per100: {
				kcal: r.kcal100g ?? 0,
				protein_g: r.protein100g ?? 0,
				carbs_g: r.carbs100g ?? 0,
				fat_g: r.fat100g ?? 0,
				fiber_g: r.fiber100g ?? undefined,
				sugar_g: r.sugars100g ?? undefined
			}
		};
	}

	type DisplayRow = {
		food: Food;
		source: SearchSource;
		nutriScoreGrade: string | null;
		servingSizeG: number | null;
	};

	const searchRows = $derived.by<DisplayRow[]>(() => {
		if (!serverResults) return [];
		return serverResults.map((r) => ({
			food: resultToFood(r),
			source: r.source,
			nutriScoreGrade: r.nutriScoreGrade,
			servingSizeG: r.servingSizeG
		}));
	});

	// Empty-state: recents (top) + favorites — both sourced from props (always-fresh from server load).
	const recentRows = $derived.by<DisplayRow[]>(() =>
		recents.map((f) => ({
			food: f,
			source: /^\d{8,14}$/.test(f.id) ? ('cache' as const) : ('user' as const),
			nutriScoreGrade: null,
			servingSizeG: null
		}))
	);
	const favoriteRows = $derived.by<DisplayRow[]>(() =>
		favorites.map((f) => ({
			food: f,
			source: /^\d{8,14}$/.test(f.id) ? ('cache' as const) : ('user' as const),
			nutriScoreGrade: null,
			servingSizeG: null
		}))
	);

	const pendingFood = $derived.by<Food | null>(() => {
		if (!pendingFoodId) return null;
		const fromCreated = createdFoods.find((f) => f.id === pendingFoodId);
		if (fromCreated) return fromCreated;
		const fromFoods = foods.find((f) => f.id === pendingFoodId);
		if (fromFoods) return fromFoods;
		const fromSearch = searchRows.find((r) => r.food.id === pendingFoodId);
		return fromSearch?.food ?? null;
	});

	const pendingPreview = $derived.by(() => {
		if (!pendingFood) return { kcal: 0, p: 0, c: 0, f: 0, fiber: null, sugar: null };
		const g = pendingGrams;
		const scale = (n: number | undefined) => Math.round(((n ?? 0) * g) / 100 * 10) / 10;
		return {
			kcal: Math.round((pendingFood.per100.kcal * g) / 100),
			p: Math.round(((pendingFood.per100.protein_g * g) / 100) * 10) / 10,
			c: Math.round(((pendingFood.per100.carbs_g * g) / 100) * 10) / 10,
			f: Math.round(((pendingFood.per100.fat_g * g) / 100) * 10) / 10,
			fiber: pendingFood.per100.fiber_g != null ? scale(pendingFood.per100.fiber_g) : null,
			sugar: pendingFood.per100.sugar_g != null ? scale(pendingFood.per100.sugar_g) : null
		};
	});

	function startPending(f: Food) {
		pendingFoodId = f.id;
		const defaultUnit = f.units?.find((u) => u.default) ?? f.units?.[0];
		pendingGrams = defaultUnit && defaultUnit.id !== 'g' ? Math.round(defaultUnit.gramsPerUnit) : 100;
	}

	function unitsFor(food: Food | null): FoodUnit[] {
		if (!food) return [{ id: 'g', gramsPerUnit: 1, default: true }];
		return food.units ?? [{ id: 'g', gramsPerUnit: 1, default: true }];
	}

	function showToast(msg: string) {
		if (toastHandle) clearTimeout(toastHandle);
		toast = msg;
		toastHandle = setTimeout(() => (toast = null), 2200);
	}

	async function commitPending() {
		if (!pendingFood || saving) return;
		saving = true;
		const f = pendingFood;
		const g = pendingGrams;
		const isBarcode = /^\d{8,14}$/.test(f.id);
		const isSeed = f.id.startsWith('seed-');
		const item = {
			foodBarcode: isBarcode ? f.id : null,
			foodUserId: !isBarcode && !isSeed ? f.id : null,
			foodName: f.name,
			grams: g,
			unit: 'g',
			kcal: Math.round((f.per100.kcal * g) / 100),
			proteinG: Math.round(((f.per100.protein_g * g) / 100) * 10) / 10,
			carbsG: Math.round(((f.per100.carbs_g * g) / 100) * 10) / 10,
			fatG: Math.round(((f.per100.fat_g * g) / 100) * 10) / 10,
			fiberG:
				f.per100.fiber_g != null
					? Math.round(((f.per100.fiber_g * g) / 100) * 10) / 10
					: undefined,
			sugarG:
				f.per100.sugar_g != null
					? Math.round(((f.per100.sugar_g * g) / 100) * 10) / 10
					: undefined
		};
		const form = new FormData();
		form.set('items', JSON.stringify([item]));
		form.set('mealSlot', mealSlot);
		try {
			const res = await fetch('/?/logEntry', { method: 'POST', body: form });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			await invalidateAll();
			showToast(`${m.added_label()} ${f.name}`);
			pendingFoodId = null;
			query = '';
			serverResults = null;
		} catch (e) {
			console.error('logEntry failed', e);
			showToast(m.search_error());
		} finally {
			saving = false;
		}
	}

	function gotoScan() {
		goto(`/scan?slot=${mealSlot}`);
	}

	function openCreate() {
		createOpen = true;
	}

	function handleCreated(created: SearchResult) {
		const food = resultToFood(created);
		createdFoods = [...createdFoods, food];
		query = '';
		serverResults = null;
		startPending(food);
		showToast(m.created_label() + ' ' + food.name);
	}

	const showRecentSection = $derived(query.trim().length < 3 && recentRows.length > 0);
	const showFavoriteSection = $derived(query.trim().length < 3 && favoriteRows.length > 0);
	const showSearchResults = $derived(query.trim().length >= 3 && serverResults != null);
	const showEmpty = $derived(
		query.trim().length >= 3 && !searching && serverResults != null && serverResults.length === 0
	);

	function badgeClass(s: SearchSource): string {
		switch (s) {
			case 'user':
				return 'own';
			case 'cache':
				return 'recent';
			case 'seed':
				return 'common';
			case 'off':
				return 'off';
		}
	}
</script>

<section
	class="panel"
	bind:this={panelEl}
	aria-label="Add to {slotLabels[mealSlot]()}"
>
	<div class="panel-head">
		<span class="head-eyebrow">— {m.adding_to_eyebrow()} {slotLabels[mealSlot]()}</span>
		<button
			class="close-btn"
			type="button"
			onclick={onClose}
			aria-label={m.action_done()}
		>
			<X size={14} strokeWidth={1.7} />
		</button>
	</div>

	<div class="search-wrap" class:searching>
		<Search size={16} strokeWidth={1.7} class="search-icon" />
		<input
			class="search-input"
			placeholder={m.add_search_placeholder()}
			bind:value={query}
			bind:this={inputEl}
			autocomplete="off"
		/>
		{#if query}
			<button class="clear" type="button" onclick={() => (query = '')} aria-label="Clear">
				<X size={13} strokeWidth={2} />
			</button>
		{/if}
		<button
			class="sb-icon-btn"
			type="button"
			onclick={gotoScan}
			aria-label={m.add_scan()}
		>
			<Barcode size={14} strokeWidth={1.7} />
		</button>
		<button
			class="sb-icon-btn"
			type="button"
			onclick={() => (legendOpen = !legendOpen)}
			aria-expanded={legendOpen}
			aria-label={m.search_legend_title()}
		>
			<HelpCircle size={14} strokeWidth={1.7} />
		</button>
	</div>

	{#if legendOpen}
		<div class="legend-pop" role="dialog" aria-label={m.search_legend_title()}>
			<div class="legend-title">{m.search_legend_title()}</div>
			<ul class="legend-list">
				<li><span class="badge own">{m.source_own()}</span> {m.search_legend_own()}</li>
				<li><span class="badge recent">{m.source_recent()}</span> {m.search_legend_recent()}</li>
				<li><span class="badge common">{m.source_common()}</span> {m.search_legend_common()}</li>
				<li><span class="badge off">{m.source_off()}</span> {m.search_legend_off()}</li>
			</ul>
		</div>
	{/if}

	<div class="results">
		{#if showSearchResults}
			{#each searchRows as r (r.food.id)}
				{@const f = r.food}
				{#if pendingFoodId === f.id && pendingFood}
					{@render expandedRow(pendingFood, r.source)}
				{:else}
					{@render rowButton(r)}
				{/if}
			{/each}

			{#if searching}
				<div class="off-loading">{m.search_loading_off()}</div>
			{/if}

			{#if globalError}
				<button class="off-error" type="button" onclick={expandGlobal}>
					<span class="oe-msg">{m.search_error()}</span>
					<span class="oe-cta">{m.search_global_retry()}</span>
				</button>
			{/if}

			{#if hasMore && !globalSearched && !searching}
				<button class="off-cta" type="button" onclick={expandGlobal}>
					<Search size={13} strokeWidth={1.7} />
					<span>{m.search_global_cta()}</span>
				</button>
			{/if}

			{#if showEmpty}
				<div class="empty">{m.add_no_results()}</div>
			{/if}
		{:else}
			{#if showRecentSection}
				<div class="group-head">
					<span class="gh-label">{m.add_recents()}</span>
				</div>
				{#each recentRows as r (r.food.id)}
					{#if pendingFoodId === r.food.id && pendingFood}
						{@render expandedRow(pendingFood, r.source)}
					{:else}
						{@render rowButton(r)}
					{/if}
				{/each}
			{/if}

			{#if showFavoriteSection}
				<div class="group-head">
					<Star size={11} strokeWidth={2} fill="currentColor" class="star-icon" />
					<span class="gh-label">{m.add_favorites()}</span>
				</div>
				{#each favoriteRows as r (r.food.id)}
					{#if pendingFoodId === r.food.id && pendingFood}
						{@render expandedRow(pendingFood, r.source)}
					{:else}
						{@render rowButton(r)}
					{/if}
				{/each}
			{/if}

			{#if !showRecentSection && !showFavoriteSection}
				<div class="hint">{m.add_search_hint()}</div>
			{/if}
		{/if}
	</div>

	{#if query.trim().length >= 1}
		<button class="create-cta" type="button" onclick={openCreate}>
			<Plus size={13} strokeWidth={1.7} />
			<span>
				{m.create_food_cta()}
				{#if query.trim()}<span class="cc-q">"{query.trim()}"</span>{/if}
			</span>
		</button>
	{/if}

	<button class="build-meal" type="button" onclick={() => onBuildMeal(mealSlot)}>
		<Layers size={13} strokeWidth={1.7} />
		<span>{m.build_meal_here()}</span>
	</button>

	{#if toast}
		<div class="toast" role="status" aria-live="polite">{toast}</div>
	{/if}
</section>

<CreateFoodSheet
	bind:open={createOpen}
	initialName={query.trim()}
	{tier}
	onCreated={handleCreated}
/>

{#snippet rowButton(r: DisplayRow)}
	{@const f = r.food}
	<button class="row" type="button" onclick={() => startPending(f)}>
		<div class="r-text">
			<div class="r-name">
				<span class="r-name-text">{f.name}</span>
				<span class="badge {badgeClass(r.source)}">{sourceLabel[r.source]()}</span>
			</div>
			<div class="r-meta-1">
				<span class="brand" class:placeholder={!f.brand}>
					{f.brand ?? m.source_generic_label()}
				</span>
				{#if r.nutriScoreGrade}
					<span class="dot">·</span>
					<span class="nutri-chip nutri-{r.nutriScoreGrade}">
						Nutri-{r.nutriScoreGrade.toUpperCase()}
					</span>
				{/if}
			</div>
			<div class="r-meta-2">
				<span class="per"><span class="num">{f.per100.kcal}</span> kcal/100g</span>
				{#if r.servingSizeG}
					<span class="dot">·</span>
					<span class="serving">{r.servingSizeG}g {m.serving_label()}</span>
				{/if}
			</div>
		</div>
		<span class="add-chip">
			<Plus size={13} strokeWidth={2} />
		</span>
	</button>
{/snippet}

{#snippet expandedRow(food: Food, source: SearchSource)}
	<div class="expand">
		<div class="ex-head">
			<div class="ex-text">
				<div class="ex-name">
					<span>{food.name}</span>
					<span class="badge {badgeClass(source)}">{sourceLabel[source]()}</span>
				</div>
				{#if food.brand}<div class="ex-brand">{food.brand}</div>{/if}
			</div>
			<button
				class="ex-close"
				type="button"
				onclick={() => (pendingFoodId = null)}
				aria-label={m.action_cancel()}
			>
				<X size={14} strokeWidth={1.7} />
			</button>
		</div>
		<div class="ex-row">
			<UnitStepper bind:grams={pendingGrams} units={unitsFor(food)} ariaLabel="Amount" />
			<div class="ex-preview">
				<span class="ex-num">{pendingPreview.kcal}</span>
				<span class="ex-unit">kcal</span>
			</div>
		</div>
		<div class="ex-macros">
			<span class="emm" style="--c:var(--color-protein)"
				><span class="emm-l">P</span><span class="emm-v">{pendingPreview.p}g</span></span
			>
			<span class="emm" style="--c:var(--color-carbs)"
				><span class="emm-l">C</span><span class="emm-v">{pendingPreview.c}g</span></span
			>
			<span class="emm" style="--c:var(--color-fat)"
				><span class="emm-l">F</span><span class="emm-v">{pendingPreview.f}g</span></span
			>
			{#if pendingPreview.fiber != null}
				<span class="emm" style="--c:var(--color-fiber, var(--color-text-muted))"
					><span class="emm-l">{m.macro_fiber()}</span><span class="emm-v"
						>{pendingPreview.fiber}g</span
					></span
				>
			{/if}
			{#if pendingPreview.sugar != null}
				<span class="emm" style="--c:var(--color-sugar, var(--color-text-muted))"
					><span class="emm-l">{m.macro_sugar()}</span><span class="emm-v"
						>{pendingPreview.sugar}g</span
					></span
				>
			{/if}
		</div>
		<button class="ex-add" type="button" onclick={commitPending} disabled={saving}>
			<Check size={14} strokeWidth={2.2} />
			<span>{m.add_to_slot()} {slotLabels[mealSlot]()}</span>
		</button>
	</div>
{/snippet}


<style>
	.panel {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 14px 12px 12px;
		margin: 6px 0 4px;
		background: color-mix(in oklab, var(--color-ember) 4%, var(--color-surface-1));
		border: 1px solid color-mix(in oklab, var(--color-ember) 18%, var(--color-border-default));
		border-radius: 14px;
		animation: panel-in 220ms cubic-bezier(0.32, 0.72, 0, 1);
	}

	@keyframes panel-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.panel-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 4px;
	}
	.head-eyebrow {
		font-family: var(--font-mono);
		font-size: 10.5px;
		letter-spacing: 0.14em;
		color: var(--color-text-faint);
		text-transform: uppercase;
	}
	.close-btn {
		all: unset;
		cursor: pointer;
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 999px;
		color: var(--color-text-subtle);
	}
	.close-btn:active {
		background: var(--color-bg-1);
	}

	.search-wrap {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		background: var(--color-bg-1);
		border-radius: 12px;
		color: var(--color-text-subtle);
	}
	.search-input {
		all: unset;
		flex: 1;
		min-width: 0;
		font-size: 14.5px;
		color: var(--color-text-primary);
	}
	.search-input::placeholder {
		color: var(--color-text-faint);
	}
	.clear {
		all: unset;
		cursor: pointer;
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 999px;
		background: var(--color-bg-2);
		color: var(--color-text-subtle);
		flex-shrink: 0;
	}
	.sb-icon-btn {
		all: unset;
		cursor: pointer;
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 999px;
		color: var(--color-text-subtle);
		flex-shrink: 0;
	}
	.sb-icon-btn:active {
		background: var(--color-bg-2);
	}
	:global(.search-icon) {
		flex-shrink: 0;
	}
	.search-wrap.searching :global(.search-icon) {
		animation: search-pulse 1200ms ease-in-out infinite;
	}
	@keyframes search-pulse {
		0%, 100% {
			opacity: 0.5;
		}
		50% {
			opacity: 1;
		}
	}

	/* ── Legend popover ── */
	.legend-pop {
		padding: 10px 12px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: 10px;
	}
	.legend-title {
		font-size: 10.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
		margin-bottom: 6px;
	}
	.legend-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 5px;
		font-size: 12px;
		color: var(--color-text-muted);
		line-height: 1.4;
	}
	.legend-list li {
		display: grid;
		grid-template-columns: 60px 1fr;
		gap: 10px;
		align-items: baseline;
	}
	.legend-list li .badge {
		justify-self: start;
	}

	/* ── Group heads (Recents / Favorites) ── */
	.group-head {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 4px 2px;
	}
	.gh-label {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}
	:global(.star-icon) {
		color: var(--color-ember);
	}

	.hint {
		padding: 14px 4px;
		font-size: 12.5px;
		color: var(--color-text-faint);
		font-style: italic;
		font-family: var(--font-display);
		font-variation-settings: 'opsz' 18, 'SOFT' 100, 'wght' 400, 'ital' 1;
	}

	.results {
		display: flex;
		flex-direction: column;
	}

	.row {
		all: unset;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 9px 4px;
		border-bottom: 1px solid var(--color-border-subtle);
		gap: 10px;
	}
	.row:active {
		background: var(--color-bg-1);
	}
	.r-text {
		flex: 1;
		min-width: 0;
	}
	.r-name {
		font-size: 13.5px;
		color: var(--color-text-primary);
		font-weight: 500;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.r-name-text {
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.r-meta-1,
	.r-meta-2 {
		display: inline-flex;
		gap: 6px;
		align-items: baseline;
		margin-top: 2px;
		font-size: 11.5px;
		color: var(--color-text-subtle);
		flex-wrap: wrap;
	}
	.r-meta-2 {
		margin-top: 1px;
		font-size: 11px;
		color: var(--color-text-faint);
	}
	.brand {
		color: var(--color-text-muted);
	}
	.brand.placeholder {
		font-style: italic;
		color: var(--color-text-faint);
	}
	.dot {
		color: var(--color-text-faint);
	}
	.per {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1;
		font-variation-settings: 'opsz' 18, 'wght' 460;
	}
	.per .num {
		color: var(--color-text-subtle);
	}
	.serving {
		font-feature-settings: 'tnum' 1;
	}
	/* ── Nutri-Score chip ── */
	.nutri-chip {
		display: inline-flex;
		align-items: center;
		font-size: 9.5px;
		font-weight: 600;
		letter-spacing: 0.04em;
		padding: 1px 6px;
		border-radius: 4px;
		color: oklch(98% 0.01 80);
		line-height: 1.4;
	}
	.nutri-a {
		background: oklch(64% 0.18 142);
	}
	.nutri-b {
		background: oklch(72% 0.16 120);
	}
	.nutri-c {
		background: oklch(78% 0.14 90);
	}
	.nutri-d {
		background: oklch(70% 0.16 60);
	}
	.nutri-e {
		background: oklch(60% 0.18 30);
	}
	.add-chip {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 999px;
		background: var(--color-bg-2);
		color: var(--color-text-muted);
		flex-shrink: 0;
	}

	.empty {
		padding: 14px 4px;
		font-size: 12.5px;
		color: var(--color-text-subtle);
	}

	/* ── Source badges ── */
	.badge {
		display: inline-flex;
		align-items: center;
		font-size: 9px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 1px 6px;
		border-radius: 999px;
		font-weight: 500;
		white-space: nowrap;
	}
	.badge.own {
		background: var(--color-bg-2);
		color: var(--color-text-muted);
	}
	.badge.recent {
		background: color-mix(in oklab, var(--color-ember) 12%, transparent);
		color: var(--color-ember-deep);
	}
	.badge.common {
		background: color-mix(in oklab, oklch(70% 0.12 145) 14%, transparent);
		color: oklch(45% 0.1 145);
	}
	.badge.off {
		background: transparent;
		color: var(--color-text-muted);
		border: 1px solid var(--color-border-strong);
	}

	/* ── OFF state hints ── */
	.off-loading {
		padding: 10px 4px;
		font-size: 11.5px;
		color: var(--color-text-subtle);
		font-style: italic;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.off-loading::before {
		content: '';
		width: 9px;
		height: 9px;
		border-radius: 999px;
		border: 1.4px solid var(--color-border-strong);
		border-top-color: var(--color-ember);
		animation: off-spin 700ms linear infinite;
	}
	@keyframes off-spin {
		to {
			transform: rotate(360deg);
		}
	}
	.off-cta {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 9px 12px;
		margin: 6px 0;
		background: var(--color-bg-1);
		color: var(--color-text-muted);
		border-radius: 10px;
		font-size: 12.5px;
		font-weight: 500;
		align-self: flex-start;
	}
	.off-cta:active {
		background: var(--color-bg-2);
	}
	.off-error {
		all: unset;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 9px 12px;
		margin: 6px 0;
		background: color-mix(in oklab, var(--color-overtarget) 6%, var(--color-surface-1));
		border: 1px solid color-mix(in oklab, var(--color-overtarget) 22%, transparent);
		border-radius: 10px;
		font-size: 12px;
	}
	.oe-msg {
		color: var(--color-text-muted);
	}
	.oe-cta {
		font-weight: 500;
		color: var(--color-overtarget);
	}

	/* ── Inline expand (pending food) ── */
	.expand {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px;
		margin: 4px 0;
		background: var(--color-surface-1);
		border: 1px solid color-mix(in oklab, var(--color-ember) 30%, var(--color-border-default));
		border-radius: 12px;
		animation: expand-in 220ms cubic-bezier(0.32, 0.72, 0, 1);
	}
	@keyframes expand-in {
		from {
			opacity: 0;
			transform: translateY(-2px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.ex-head {
		display: grid;
		grid-template-columns: 1fr 24px;
		gap: 8px;
		align-items: start;
	}
	.ex-text {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}
	.ex-name {
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-primary);
		display: inline-flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.ex-brand {
		font-size: 11.5px;
		color: var(--color-text-subtle);
	}
	.ex-close {
		all: unset;
		cursor: pointer;
		width: 24px;
		height: 24px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		color: var(--color-text-muted);
	}
	.ex-row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 12px;
		align-items: center;
	}
	.ex-preview {
		display: flex;
		align-items: baseline;
		gap: 4px;
	}
	.ex-num {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1;
		font-variation-settings: 'opsz' 60, 'SOFT' 80, 'wght' 500;
		font-size: 22px;
		letter-spacing: -0.025em;
		color: var(--color-text-primary);
	}
	.ex-unit {
		font-size: 9.5px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}
	.ex-macros {
		display: flex;
		gap: 14px;
	}
	.emm {
		display: inline-flex;
		align-items: baseline;
		gap: 4px;
	}
	.emm-l {
		font-size: 9.5px;
		letter-spacing: 0.16em;
		color: var(--c);
		font-weight: 600;
	}
	.emm-v {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1;
		font-variation-settings: 'opsz' 18, 'wght' 460;
		font-size: 11.5px;
		color: var(--color-text-muted);
	}
	.ex-add {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		gap: 6px;
		padding: 10px 16px;
		background: var(--color-text-primary);
		color: var(--color-bg-0);
		border-radius: 10px;
		font-size: 13px;
		font-weight: 500;
	}
	.ex-add:active {
		transform: scale(0.99);
	}
	.ex-add:disabled {
		opacity: 0.5;
		cursor: default;
	}

	/* ── Build a meal footer ── */
	.build-meal {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 9px 4px 4px;
		font-size: 11.5px;
		color: var(--color-text-subtle);
		align-self: flex-start;
		border-top: 1px dashed var(--color-border-subtle);
		margin-top: 4px;
		padding-top: 10px;
		width: 100%;
	}
	.build-meal:active {
		color: var(--color-text-primary);
	}

	/* ── Create custom food ── */
	.create-cta {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 9px 12px;
		margin: 4px 0;
		background: var(--color-bg-1);
		color: var(--color-text-muted);
		border-radius: 10px;
		font-size: 12px;
		align-self: flex-start;
		max-width: 100%;
	}
	.create-cta:active {
		background: var(--color-bg-2);
	}
	.cc-q {
		color: var(--color-text-primary);
		font-weight: 500;
		margin-left: 4px;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 200px;
	}


	/* ── Toast ── */
	.toast {
		position: absolute;
		bottom: -8px;
		left: 50%;
		transform: translateX(-50%) translateY(100%);
		padding: 8px 14px;
		background: var(--color-text-primary);
		color: var(--color-bg-0);
		border-radius: 999px;
		font-size: 12px;
		font-weight: 500;
		white-space: nowrap;
		animation: toast-in 300ms cubic-bezier(0.32, 0.72, 0, 1);
		z-index: 10;
	}
	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(80%);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(100%);
		}
	}
</style>
