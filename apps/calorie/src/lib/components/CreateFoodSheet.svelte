<script lang="ts">
	import { Check, X } from '@lucide/svelte';
	import { BottomSheet } from '@nexo/ui';
	import { m } from '$lib/paraglide/messages.js';

	type CreatedFood = {
		id: string;
		source: 'user';
		name: string;
		brand: string | null;
		kcal100g: number;
		protein100g: number;
		carbs100g: number;
		fat100g: number;
		fiber100g: number | null;
		sugars100g: number | null;
		nutriScoreGrade: string | null;
		servingSizeG: number | null;
	};

	let {
		open = $bindable(false),
		initialName = '',
		onCreated
	}: {
		open: boolean;
		initialName?: string;
		onCreated: (food: CreatedFood) => void;
	} = $props();

	let name = $state('');
	let brand = $state('');
	let kcal = $state('');
	let p = $state('');
	let c = $state('');
	let f = $state('');
	let saving = $state(false);
	let error = $state<string | null>(null);

	// Reset whenever the sheet (re)opens.
	let lastOpenSnapshot = false;
	$effect(() => {
		if (open && !lastOpenSnapshot) {
			name = initialName;
			brand = '';
			kcal = '';
			p = '';
			c = '';
			f = '';
			error = null;
		}
		lastOpenSnapshot = open;
	});

	// Live kcal estimate from macros (4·P + 4·C + 9·F). Helps the user notice when
	// they typed a macro but forgot kcal — and teaches the math along the way.
	const macroKcal = $derived.by(() => {
		const pn = Number(p);
		const cn = Number(c);
		const fn = Number(f);
		const total =
			(Number.isFinite(pn) ? pn * 4 : 0) +
			(Number.isFinite(cn) ? cn * 4 : 0) +
			(Number.isFinite(fn) ? fn * 9 : 0);
		return Math.round(total);
	});

	const showMacroKcalHint = $derived.by(() => {
		if (macroKcal <= 0) return false;
		const k = Number(kcal);
		// Show if no kcal yet, or if user's entered kcal differs by >5 from macro math.
		if (!Number.isFinite(k) || k <= 0) return true;
		return Math.abs(k - macroKcal) > 5;
	});

	function applyMacroKcal() {
		kcal = String(macroKcal);
	}

	async function save() {
		if (saving) return;
		const trimmedName = name.trim();
		const k = Number(kcal);
		if (trimmedName.length < 1) {
			error = m.create_food_error_name();
			return;
		}
		if (!Number.isFinite(k) || k < 0) {
			error = m.create_food_error_kcal();
			return;
		}
		saving = true;
		error = null;
		try {
			const res = await fetch('/api/foods', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: trimmedName,
					brand: brand.trim() || null,
					kcal100g: k,
					protein100g: Number(p) || 0,
					carbs100g: Number(c) || 0,
					fat100g: Number(f) || 0
				})
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const created = (await res.json()) as CreatedFood;
			open = false;
			onCreated(created);
		} catch (e) {
			console.error('createFood failed', e);
			error = m.search_error();
		} finally {
			saving = false;
		}
	}
</script>

<BottomSheet bind:open title={m.create_food_heading()} subtitle={m.create_food_subtitle()}>
	<div class="content">
		<div class="title-block">
			<input
				class="title-input"
				type="text"
				bind:value={name}
				placeholder={m.create_food_name_placeholder()}
				autocomplete="off"
				aria-label={m.create_food_name()}
			/>
			<input
				class="brand-input"
				type="text"
				bind:value={brand}
				placeholder={m.create_food_brand_placeholder()}
				autocomplete="off"
				aria-label={m.create_food_brand()}
			/>
		</div>

		<div class="rule">
			<span class="rule-line"></span>
			<span class="rule-eyebrow">{m.create_food_per100g()}</span>
			<span class="rule-line"></span>
		</div>

		<p class="macro-hint-text">{m.create_food_macro_hint()}</p>

		<div class="macro-grid">
			<label class="macro-cell macro-kcal">
				<input
					class="macro-num"
					type="text"
					inputmode="numeric"
					bind:value={kcal}
					placeholder="0"
				/>
				<span class="macro-label">{m.unit_kcal()}</span>
			</label>
			<label class="macro-cell" style="--c:var(--color-protein)">
				<input
					class="macro-num"
					type="text"
					inputmode="numeric"
					bind:value={p}
					placeholder="0"
				/>
				<span class="macro-label">P · g</span>
			</label>
			<label class="macro-cell" style="--c:var(--color-carbs)">
				<input
					class="macro-num"
					type="text"
					inputmode="numeric"
					bind:value={c}
					placeholder="0"
				/>
				<span class="macro-label">C · g</span>
			</label>
			<label class="macro-cell" style="--c:var(--color-fat)">
				<input
					class="macro-num"
					type="text"
					inputmode="numeric"
					bind:value={f}
					placeholder="0"
				/>
				<span class="macro-label">F · g</span>
			</label>
		</div>

		{#if showMacroKcalHint}
			<button class="macro-hint" type="button" onclick={applyMacroKcal}>
				<span class="hint-prefix">≈</span>
				<span class="hint-num">{macroKcal}</span>
				<span class="hint-unit">{m.unit_kcal()}</span>
				<span class="hint-sep">·</span>
				<span class="hint-cta">{m.create_food_use_macro_kcal()}</span>
			</button>
		{/if}

		{#if error}
			<div class="error">{error}</div>
		{/if}

		<div class="save-bar">
			<button class="save-cta" type="button" onclick={save} disabled={saving}>
				<Check size={15} strokeWidth={2.2} />
				<span>{m.create_food_save()}</span>
			</button>
		</div>
	</div>
</BottomSheet>

<style>
	.content {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 4px 0 8px;
	}

	/* ── Title block: like writing on a recipe card ── */
	.title-block {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding-bottom: 4px;
	}

	.title-input {
		all: unset;
		font-family: var(--font-display);
		font-variation-settings:
			'opsz' 96,
			'SOFT' 80,
			'wght' 470;
		font-size: clamp(22px, 5.4vw, 28px);
		line-height: 1.05;
		letter-spacing: -0.02em;
		color: var(--color-text-primary);
		padding: 4px 0;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.title-input::placeholder {
		color: var(--color-text-faint);
		font-style: italic;
	}

	.brand-input {
		all: unset;
		font-size: 13px;
		color: var(--color-text-muted);
		padding: 4px 0;
		font-style: italic;
	}

	.brand-input::placeholder {
		color: var(--color-text-faint);
	}

	/* ── Per-100g eyebrow rule ── */
	.rule {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 4px 0;
	}

	.rule-line {
		flex: 1;
		height: 1px;
		background: var(--color-border-subtle);
	}

	.rule-eyebrow {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}

	.macro-hint-text {
		margin: -4px 0 0;
		font-size: 12px;
		line-height: 1.45;
		color: var(--color-text-subtle);
		font-style: italic;
	}

	/* ── Nutrition-label grid ── */
	.macro-grid {
		display: grid;
		grid-template-columns: 1.4fr 1fr 1fr 1fr;
		gap: 1px;
		background: var(--color-border-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: 12px;
		overflow: hidden;
	}

	.macro-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 14px 8px 12px;
		background: var(--color-surface-1);
		cursor: text;
		transition: background 160ms;
		position: relative;
	}

	.macro-cell:focus-within {
		background: color-mix(in oklab, var(--c, var(--color-ember)) 5%, var(--color-surface-1));
	}

	.macro-cell::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 2px;
		background: var(--c, var(--color-ember));
		opacity: 0;
		transition: opacity 160ms;
	}

	.macro-cell:focus-within::before {
		opacity: 0.7;
	}

	.macro-num {
		all: unset;
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1;
		font-variation-settings:
			'opsz' 60,
			'SOFT' 80,
			'wght' 500;
		font-size: 26px;
		letter-spacing: -0.025em;
		color: var(--color-text-primary);
		text-align: center;
		width: 100%;
		min-width: 0;
	}

	.macro-num::placeholder {
		color: var(--color-text-faint);
	}

	.macro-label {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}

	.macro-cell:not(.macro-kcal) .macro-label {
		color: color-mix(in oklab, var(--c) 70%, var(--color-text-subtle));
	}

	.macro-kcal .macro-label {
		color: var(--color-ember-deep);
	}

	/* ── Live macro→kcal hint ── */
	.macro-hint {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: baseline;
		gap: 5px;
		padding: 6px 0 0;
		font-size: 12px;
		color: var(--color-text-subtle);
		align-self: flex-start;
	}

	.macro-hint:active {
		color: var(--color-ember-deep);
	}

	.hint-prefix {
		color: var(--color-text-faint);
	}

	.hint-num {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1;
		font-variation-settings:
			'opsz' 24,
			'wght' 460;
		color: var(--color-text-primary);
	}

	.hint-unit {
		font-size: 10px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}

	.hint-sep {
		color: var(--color-text-faint);
	}

	.hint-cta {
		text-decoration: underline;
		text-decoration-style: dotted;
		text-underline-offset: 3px;
	}

	/* ── Error & save ── */
	.error {
		padding: 10px 12px;
		background: color-mix(in oklab, var(--color-overtarget) 8%, transparent);
		color: var(--color-overtarget);
		border-radius: 10px;
		font-size: 12.5px;
	}

	.save-bar {
		position: sticky;
		bottom: 0;
		display: flex;
		padding: 10px 0 6px;
		margin-top: 6px;
		background: linear-gradient(
			to top,
			var(--color-surface-1) 70%,
			color-mix(in oklab, var(--color-surface-1) 50%, transparent)
		);
	}

	.save-cta {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		gap: 6px;
		padding: 14px 20px;
		background: var(--color-ember);
		color: oklch(98% 0.008 70);
		border-radius: 14px;
		font-size: 14.5px;
		font-weight: 500;
		letter-spacing: -0.005em;
		box-shadow: 0 6px 18px -10px var(--color-ember-deep);
		transition:
			transform 120ms,
			background 160ms;
		flex: 1;
	}

	.save-cta:active:not(:disabled) {
		transform: scale(0.99);
		background: var(--color-ember-deep);
	}

	.save-cta:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>
