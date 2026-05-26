<script lang="ts">
	import { ArrowLeft, ArrowRight, Activity, ScrollText, X, Check } from '@lucide/svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import { calculateTargets } from '$lib/calc';
	import type { ActivityLevel, Goal, MacroTier, Sex, Targets } from '$lib/types';
	import Stepper from '$lib/components/Stepper.svelte';
	import { m } from '$lib/paraglide/messages.js';

	type Step = 'welcome' | 'track' | 'method' | 'body' | 'targets' | 'done';

	const stepOrder: Step[] = ['welcome', 'track', 'method', 'body', 'targets', 'done'];

	let step = $state<Step>('welcome');

	let tier = $state<MacroTier>('extended');
	let method = $state<'formula' | 'custom'>('formula');

	let sex = $state<Sex>('male');
	let age = $state(32);
	let heightCm = $state(182);
	let weightKg = $state(78);
	let activity = $state<number>(3);
	let goal = $state<Goal>('maintain');

	let targets = $state<Targets>(
		untrack(() =>
			calculateTargets({
				sex,
				age,
				heightCm,
				weightKg,
				activity: activity as ActivityLevel,
				goal,
				tier
			})
		)
	);
	let editing = $state<keyof Targets | null>(null);
	let saving = $state(false);

	function recalc() {
		targets = calculateTargets({
			sex,
			age,
			heightCm,
			weightKg,
			activity: activity as ActivityLevel,
			goal,
			tier
		});
	}

	function next() {
		const i = stepOrder.indexOf(step);
		if (step === 'method' && method === 'custom') {
			step = 'targets';
			return;
		}
		if (step === 'body') recalc();
		if (i < stepOrder.length - 1) step = stepOrder[i + 1];
	}

	function back() {
		const i = stepOrder.indexOf(step);
		if (step === 'targets' && method === 'custom') {
			step = 'method';
			return;
		}
		if (i > 0) step = stepOrder[i - 1];
	}

	async function finish() {
		if (saving) return;
		saving = true;
		const form = new FormData();
		form.set('sex', sex);
		form.set('age', String(age));
		form.set('heightCm', String(heightCm));
		form.set('weightKg', String(weightKg));
		form.set('activity', String(activity));
		form.set('goal', goal);
		form.set('tier', tier);
		form.set('targetKcal', String(targets.kcal));
		form.set('targetProteinG', String(targets.protein_g));
		form.set('targetCarbsG', String(targets.carbs_g));
		form.set('targetFatG', String(targets.fat_g));
		form.set('targetsCustom', method === 'custom' ? 'true' : 'false');
		try {
			const res = await fetch('/settings?/completeOnboarding', {
				method: 'POST',
				body: form
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			await invalidateAll();
			goto('/');
		} catch (e) {
			console.error('onboarding submit failed', e);
			saving = false;
		}
	}

	const stepIndex = $derived(stepOrder.indexOf(step));
	const visibleSteps = $derived(method === 'custom' ? 4 : 5);

	const trackOptions: Array<{
		id: MacroTier;
		title: string;
		tagline: string;
		bestFor: string;
		shows: Array<{ key: string; label: string; color: string }>;
	}> = [
		{
			id: 'basic',
			title: m.track_kcal_only(),
			tagline: m.track_kcal_only_tag(),
			bestFor: m.track_kcal_only_for(),
			shows: [{ key: 'kcal', label: 'kcal', color: '--color-ember' }]
		},
		{
			id: 'extended',
			title: m.track_kcal_protein(),
			tagline: m.track_kcal_protein_tag(),
			bestFor: m.track_kcal_protein_for(),
			shows: [
				{ key: 'kcal', label: 'kcal', color: '--color-ember' },
				{ key: 'protein', label: 'Protein', color: '--color-protein' }
			]
		},
		{
			id: 'full',
			title: m.track_macros(),
			tagline: m.track_macros_tag(),
			bestFor: m.track_macros_for(),
			shows: [
				{ key: 'kcal', label: 'kcal', color: '--color-ember' },
				{ key: 'protein', label: 'Protein', color: '--color-protein' },
				{ key: 'carbs', label: 'Carbs', color: '--color-carbs' },
				{ key: 'fat', label: 'Fat', color: '--color-fat' }
			]
		},
		{
			id: 'full',
			title: m.track_everything(),
			tagline: m.track_everything_tag(),
			bestFor: m.track_everything_for(),
			shows: [
				{ key: 'kcal', label: 'kcal', color: '--color-ember' },
				{ key: 'protein', label: 'P', color: '--color-protein' },
				{ key: 'carbs', label: 'C', color: '--color-carbs' },
				{ key: 'fat', label: 'F', color: '--color-fat' },
				{ key: 'fiber', label: 'Fiber', color: '--color-fiber' },
				{ key: 'sugar', label: 'Sugar', color: '--color-sugar' },
				{ key: 'satfat', label: 'Sat', color: '--color-satfat' },
				{ key: 'sodium', label: 'Na', color: '--color-sodium' }
			]
		}
	];

	let selectedTrackIdx = $state(1);
	$effect(() => {
		tier = trackOptions[selectedTrackIdx].id;
	});

	const sexOpts: Sex[] = ['female', 'male', 'other'];
	const goalOpts: Goal[] = ['cut', 'maintain', 'bulk'];
	const activityLabels: Record<ActivityLevel, () => string> = {
		1: m.profile_activity_1,
		2: m.profile_activity_2,
		3: m.profile_activity_3,
		4: m.profile_activity_4,
		5: m.profile_activity_5
	};
	const sexLabels: Record<Sex, () => string> = {
		female: m.profile_sex_female,
		male: m.profile_sex_male,
		other: m.profile_sex_other
	};
	const goalLabels: Record<Goal, () => string> = {
		cut: m.goal_cut,
		maintain: m.goal_maintain,
		bulk: m.goal_bulk
	};

	function commitEdit(field: keyof Targets, val: string) {
		const n = parseInt(val, 10);
		if (!isNaN(n) && n > 0) targets[field] = n as never;
		editing = null;
	}
</script>

<div class="onb">
	<header class="onb-top">
		<button class="onb-skip" type="button" onclick={finish} aria-label={m.action_skip()}>
			<X size={16} strokeWidth={1.7} />
		</button>
		<div class="onb-pips" aria-hidden="true">
			{#each Array.from({ length: visibleSteps }, (_, i) => i) as i (i)}
				{@const adj = method === 'custom' && stepIndex >= 2 ? stepIndex - 1 : stepIndex}
				<span class="pip" class:done={i < adj} class:on={i === adj}></span>
			{/each}
		</div>
		<span class="onb-spacer"></span>
	</header>

	<main class="onb-body">
		{#if step === 'welcome'}
			<div class="step welcome">
				<!-- Hero food-illustration -->
				<div class="hero" aria-hidden="true">
					<svg viewBox="0 0 240 240" width="220" height="220" class="hero-svg">
						<defs>
							<linearGradient id="halo" x1="0%" y1="0%" x2="100%" y2="50%">
								<stop offset="0%" stop-color="var(--color-ember-soft)" />
								<stop offset="100%" stop-color="var(--color-ember-deep)" />
							</linearGradient>
							<radialGradient id="plate-grad" cx="35%" cy="30%" r="70%">
								<stop offset="0%" stop-color="oklch(99% 0.006 70)" />
								<stop offset="100%" stop-color="oklch(94% 0.018 72)" />
							</radialGradient>
						</defs>

						<!-- Soft ember halo arc — top, like the kcal ring -->
						<path
							class="halo-arc"
							d="M 56 122 A 70 70 0 0 1 184 122"
							fill="none"
							stroke="url(#halo)"
							stroke-width="3"
							stroke-linecap="round"
							opacity="0.55"
						/>

						<!-- Fork (left) -->
						<g
							class="utensil left"
							stroke="var(--color-text-subtle)"
							stroke-width="1.4"
							stroke-linecap="round"
							fill="none"
						>
							<line x1="32" y1="80" x2="32" y2="180" />
							<line x1="28" y1="80" x2="28" y2="105" />
							<line x1="36" y1="80" x2="36" y2="105" />
							<line x1="24" y1="80" x2="24" y2="105" />
							<line x1="40" y1="80" x2="40" y2="105" />
						</g>

						<!-- Knife (right) -->
						<g
							class="utensil right"
							stroke="var(--color-text-subtle)"
							stroke-width="1.4"
							stroke-linecap="round"
							fill="none"
						>
							<line x1="208" y1="80" x2="208" y2="180" />
							<path
								d="M 200 78 Q 208 70 216 78 Q 216 95 208 110 Q 200 95 200 78 Z"
								fill="var(--color-bone-1, var(--color-bg-1))"
							/>
						</g>

						<!-- Plate -->
						<circle
							cx="120"
							cy="135"
							r="62"
							fill="url(#plate-grad)"
							stroke="var(--color-border-default)"
							stroke-width="1"
						/>
						<circle
							cx="120"
							cy="135"
							r="50"
							fill="none"
							stroke="var(--color-border-subtle)"
							stroke-width="1"
							stroke-dasharray="1.5 4"
							opacity="0.7"
						/>

						<!-- Three macro dots inside the plate -->
						<circle cx="100" cy="120" r="9" fill="var(--color-protein)" opacity="0.85" />
						<circle cx="138" cy="118" r="11" fill="var(--color-carbs)" opacity="0.85" />
						<circle cx="118" cy="148" r="8" fill="var(--color-fat)" opacity="0.85" />

						<!-- Subtle steam wisp (animated) -->
						<g
							class="steam"
							stroke="var(--color-ember)"
							stroke-width="1.2"
							stroke-linecap="round"
							fill="none"
							opacity="0.4"
						>
							<path d="M 105 92 Q 110 86 105 80 Q 100 74 105 68" />
							<path d="M 122 88 Q 127 82 122 76 Q 117 70 122 64" />
							<path d="M 138 92 Q 143 86 138 80 Q 133 74 138 68" />
						</g>
					</svg>
				</div>

				<h1 class="onb-title serif">{m.onb_welcome_title()}</h1>
				<p class="onb-desc">{m.onb_welcome_desc()}</p>

				<!-- Feature cards instead of dot list -->
				<div class="feature-cards">
					<div class="fc">
						<div class="fc-icon" aria-hidden="true">
							<svg
								viewBox="0 0 24 24"
								width="16"
								height="16"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
							>
								<circle cx="12" cy="12" r="9" />
								<circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none" />
								<circle cx="14" cy="10.5" r="1.4" fill="currentColor" stroke="none" />
								<circle cx="11" cy="14" r="1" fill="currentColor" stroke="none" />
							</svg>
						</div>
						<div class="fc-text">
							<div class="fc-title">{m.onb_feature_log_title()}</div>
							<div class="fc-body">{m.onb_feature_log_body()}</div>
						</div>
					</div>
					<div class="fc">
						<div class="fc-icon" aria-hidden="true">
							<svg
								viewBox="0 0 24 24"
								width="16"
								height="16"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
							>
								<line x1="4" y1="8" x2="20" y2="8" />
								<line x1="4" y1="12" x2="14" y2="12" />
								<line x1="4" y1="16" x2="18" y2="16" />
							</svg>
						</div>
						<div class="fc-text">
							<div class="fc-title">{m.onb_feature_macros_title()}</div>
							<div class="fc-body">{m.onb_feature_macros_body()}</div>
						</div>
					</div>
					<div class="fc">
						<div class="fc-icon" aria-hidden="true">
							<svg
								viewBox="0 0 24 24"
								width="16"
								height="16"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="round"
							>
								<rect x="4" y="5" width="16" height="15" rx="2" />
								<line x1="4" y1="10" x2="20" y2="10" />
								<line x1="9" y1="3" x2="9" y2="7" />
								<line x1="15" y1="3" x2="15" y2="7" />
								<circle cx="9" cy="14" r="1" fill="currentColor" stroke="none" />
								<circle cx="13" cy="14" r="1" fill="currentColor" stroke="none" />
								<circle cx="17" cy="14" r="1" fill="currentColor" stroke="none" />
							</svg>
						</div>
						<div class="fc-text">
							<div class="fc-title">{m.onb_feature_history_title()}</div>
							<div class="fc-body">{m.onb_feature_history_body()}</div>
						</div>
					</div>
				</div>
			</div>
		{:else if step === 'track'}
			<div class="step">
				<div class="step-head">
					<span class="eyebrow">{m.onb_track_eyebrow()}</span>
					<h1 class="onb-title serif">{m.onb_track_title()}</h1>
					<p class="onb-desc">{m.onb_track_desc()}</p>
				</div>

				<div class="track-grid">
					{#each trackOptions as opt, i (i)}
						{@const sel = selectedTrackIdx === i}
						<button
							class="track-opt"
							class:selected={sel}
							type="button"
							onclick={() => (selectedTrackIdx = i)}
							aria-pressed={sel}
						>
							<div class="to-head">
								<span class="to-num">{String(i + 1).padStart(2, '0')}</span>
								<span class="to-title serif">{opt.title}</span>
								<span class="to-check">
									{#if sel}<Check size={12} strokeWidth={2.6} />{/if}
								</span>
							</div>
							<div class="to-pills">
								{#each opt.shows as s (s.key)}
									<span class="m-pill" style:--m="var({s.color})">
										<span class="m-dot"></span>
										{s.label}
									</span>
								{/each}
							</div>
							<p class="to-for">{opt.bestFor}</p>
						</button>
					{/each}
				</div>
			</div>
		{:else if step === 'method'}
			<div class="step">
				<div class="step-head">
					<span class="eyebrow">{m.onb_method_eyebrow()}</span>
					<h1 class="onb-title serif">{m.onb_method_title()}</h1>
					<p class="onb-desc">{m.onb_method_desc()}</p>
				</div>

				<div class="method-cards">
					<button
						class="method-card"
						class:selected={method === 'formula'}
						type="button"
						onclick={() => (method = 'formula')}
					>
						<div class="mc-icon-wrap accent">
							<Activity size={20} strokeWidth={1.6} />
						</div>
						<div class="mc-text">
							<div class="mc-title serif">{m.onb_method_formula_title()}</div>
							<div class="mc-body">{m.onb_method_formula_body()}</div>
						</div>
						<div class="mc-check">
							{#if method === 'formula'}<Check size={13} strokeWidth={2.6} />{/if}
						</div>
					</button>
					<button
						class="method-card"
						class:selected={method === 'custom'}
						type="button"
						onclick={() => (method = 'custom')}
					>
						<div class="mc-icon-wrap muted">
							<ScrollText size={20} strokeWidth={1.6} />
						</div>
						<div class="mc-text">
							<div class="mc-title serif">{m.onb_method_custom_title()}</div>
							<div class="mc-body">{m.onb_method_custom_body()}</div>
						</div>
						<div class="mc-check">
							{#if method === 'custom'}<Check size={13} strokeWidth={2.6} />{/if}
						</div>
					</button>
				</div>
			</div>
		{:else if step === 'body'}
			<div class="step">
				<div class="step-head">
					<span class="eyebrow">{m.onb_body_eyebrow()}</span>
					<h1 class="onb-title serif">{m.onb_body_title()}</h1>
					<p class="onb-desc">{m.onb_body_desc()}</p>
				</div>

				<div class="form">
					<fieldset class="field">
						<legend class="f-label">{m.profile_sex()}</legend>
						<div class="seg">
							{#each sexOpts as s (s)}
								<button
									class="seg-btn"
									class:on={sex === s}
									type="button"
									onclick={() => (sex = s)}
								>
									{sexLabels[s]()}
								</button>
							{/each}
						</div>
					</fieldset>

					<!-- Stepper rows for age / height / weight -->
					<div class="stepper-rows">
						<div class="stepper-row">
							<span class="sr-label">{m.profile_age()}</span>
							<Stepper
								bind:value={age}
								min={14}
								max={100}
								step={1}
								ariaLabel={m.profile_age()}
							/>
						</div>
						<div class="stepper-row">
							<span class="sr-label">{m.profile_height()}</span>
							<Stepper
								bind:value={heightCm}
								min={120}
								max={220}
								step={1}
								ariaLabel={m.profile_height()}
							/>
						</div>
						<div class="stepper-row">
							<span class="sr-label">{m.profile_weight()}</span>
							<Stepper
								bind:value={weightKg}
								min={35}
								max={220}
								step={0.5}
								decimals={1}
								ariaLabel={m.profile_weight()}
							/>
						</div>
					</div>

					<div class="field">
						<div class="slider-head">
							<span class="f-label">{m.profile_activity()}</span>
							<span class="slider-current serif">{activityLabels[activity as ActivityLevel]()}</span>
						</div>
						<input
							type="range"
							min="1"
							max="5"
							step="1"
							bind:value={activity}
							class="slider"
							aria-label={m.profile_activity()}
						/>
						<div class="slider-ticks" aria-hidden="true">
							{#each [1, 2, 3, 4, 5] as i (i)}
								<span class="tick" class:on={i <= activity}></span>
							{/each}
						</div>
					</div>

					<fieldset class="field">
						<legend class="f-label">{m.profile_goal()}</legend>
						<div class="goal-row">
							{#each goalOpts as g (g)}
								<button
									class="goal-btn"
									class:on={goal === g}
									type="button"
									onclick={() => (goal = g)}
								>
									{goalLabels[g]()}
								</button>
							{/each}
						</div>
					</fieldset>
				</div>
			</div>
		{:else if step === 'targets'}
			<div class="step targets-step">
				<div class="step-head">
					<span class="eyebrow">{m.onb_targets_eyebrow()}</span>
					<h1 class="onb-title serif">{m.onb_targets_title()}</h1>
					<p class="onb-desc">{m.onb_targets_desc()}</p>
				</div>

				<button
					class="hero-target"
					type="button"
					onclick={() => (editing = 'kcal')}
					aria-label="Edit kcal target"
				>
					<span class="ht-eyebrow">{m.unit_kcal().toUpperCase()}</span>
					{#if editing === 'kcal'}
						<!-- svelte-ignore a11y_autofocus -->
						<input
							class="ht-input"
							type="number"
							inputmode="numeric"
							value={targets.kcal}
							autofocus
							onblur={(e) => commitEdit('kcal', e.currentTarget.value)}
						/>
					{:else}
						<span class="ht-num">{targets.kcal.toLocaleString()}</span>
					{/if}
					<span class="ht-sub">per day · tap to edit</span>
				</button>

				<div class="macro-grid">
					{#if tier !== 'basic'}
						<button
							class="cell"
							style="--c:var(--color-protein)"
							type="button"
							onclick={() => (editing = 'protein_g')}
						>
							<span class="c-label">{m.macro_protein()}</span>
							{#if editing === 'protein_g'}
								<!-- svelte-ignore a11y_autofocus -->
								<input
									class="c-input"
									type="number"
									value={targets.protein_g}
									autofocus
									onblur={(e) => commitEdit('protein_g', e.currentTarget.value)}
								/>
							{:else}
								<span class="c-num">{targets.protein_g}<span class="g">g</span></span>
							{/if}
						</button>
					{/if}
					{#if tier === 'extended' || tier === 'full'}
						<button
							class="cell"
							style="--c:var(--color-carbs)"
							type="button"
							onclick={() => (editing = 'carbs_g')}
						>
							<span class="c-label">{m.macro_carbs()}</span>
							{#if editing === 'carbs_g'}
								<!-- svelte-ignore a11y_autofocus -->
								<input
									class="c-input"
									type="number"
									value={targets.carbs_g}
									autofocus
									onblur={(e) => commitEdit('carbs_g', e.currentTarget.value)}
								/>
							{:else}
								<span class="c-num">{targets.carbs_g}<span class="g">g</span></span>
							{/if}
						</button>
						<button
							class="cell"
							style="--c:var(--color-fat)"
							type="button"
							onclick={() => (editing = 'fat_g')}
						>
							<span class="c-label">{m.macro_fat()}</span>
							{#if editing === 'fat_g'}
								<!-- svelte-ignore a11y_autofocus -->
								<input
									class="c-input"
									type="number"
									value={targets.fat_g}
									autofocus
									onblur={(e) => commitEdit('fat_g', e.currentTarget.value)}
								/>
							{:else}
								<span class="c-num">{targets.fat_g}<span class="g">g</span></span>
							{/if}
						</button>
					{/if}
					{#if tier === 'full'}
						<button
							class="cell"
							style="--c:var(--color-fiber)"
							type="button"
							onclick={() => (editing = 'fiber_g')}
						>
							<span class="c-label">{m.macro_fiber()}</span>
							<span class="c-num">{targets.fiber_g}<span class="g">g</span></span>
						</button>
					{/if}
				</div>

				{#if method === 'formula'}
					<div class="formula-note">
						<span class="fn-eyebrow">{m.onb_targets_formula_used()}</span>
						<span class="fn-text"
							>Mifflin-St Jeor · {goalLabels[goal]()} · {activityLabels[
								activity as ActivityLevel
							]()}</span
						>
					</div>
				{/if}
			</div>
		{:else}
			<div class="step done">
				<div class="done-illust">
					<svg viewBox="0 0 80 80" width="68" height="68" fill="none">
						<circle
							cx="40"
							cy="40"
							r="34"
							stroke="var(--color-ember-soft)"
							stroke-width="1.5"
							stroke-dasharray="2 5"
							opacity="0.5"
						/>
						<circle cx="40" cy="40" r="26" fill="var(--color-ember)" />
						<path
							d="M 28 40 L 36 48 L 52 32"
							stroke="oklch(98% 0.008 70)"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
							fill="none"
						/>
					</svg>
				</div>
				<h1 class="onb-title serif">{m.onb_done_title()}</h1>
				<p class="onb-desc">{m.onb_done_desc()}</p>
			</div>
		{/if}
	</main>

	<footer class="onb-foot">
		{#if step !== 'welcome'}
			<button class="back-btn" type="button" onclick={back}>
				<ArrowLeft size={14} strokeWidth={2} />
				<span>{m.action_back()}</span>
			</button>
		{:else}
			<span></span>
		{/if}

		{#if step === 'done'}
			<button class="cta-btn" type="button" onclick={finish}>
				{m.onb_start_logging()}
				<ArrowRight size={15} strokeWidth={2} />
			</button>
		{:else}
			<button class="cta-btn" type="button" onclick={next}>
				{step === 'welcome' ? m.action_get_started() : m.action_continue()}
				<ArrowRight size={15} strokeWidth={2} />
			</button>
		{/if}
	</footer>
</div>

<style>
	.onb {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		max-width: var(--app-max-w, 480px);
		margin-inline: auto;
		padding-top: var(--safe-top);
		padding-bottom: calc(var(--safe-bot) + 8px);
		background:
			radial-gradient(
				circle at 15% -5%,
				color-mix(in oklab, var(--color-ember) 22%, transparent),
				transparent 50%
			),
			radial-gradient(
				circle at 95% 100%,
				color-mix(in oklab, var(--color-ember) 14%, transparent),
				transparent 55%
			),
			var(--color-bg-0);
		position: relative;
		z-index: 1;
	}

	.onb-top {
		display: grid;
		grid-template-columns: 36px 1fr 36px;
		align-items: center;
		padding: 14px 18px 8px;
	}

	.onb-skip {
		all: unset;
		cursor: pointer;
		width: 32px;
		height: 32px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		color: var(--color-text-muted);
		background: color-mix(in oklab, var(--color-bg-0) 60%, transparent);
		border: 1px solid var(--color-border-subtle);
	}

	.onb-spacer {
		display: block;
	}

	.onb-pips {
		display: flex;
		gap: 6px;
		justify-content: center;
	}

	.pip {
		width: 22px;
		height: 4px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--color-text-faint) 32%, transparent);
		transition: all 240ms cubic-bezier(0.32, 0.72, 0, 1);
	}

	.pip.done {
		background: color-mix(in oklab, var(--color-ember) 50%, transparent);
	}

	.pip.on {
		background: var(--color-ember);
		width: 36px;
	}

	.onb-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 12px 22px 16px;
		overflow-y: auto;
	}

	.step {
		display: flex;
		flex-direction: column;
		gap: 22px;
		padding-top: 8px;
	}

	.welcome {
		justify-content: flex-start;
		text-align: center;
		align-items: center;
		gap: 14px;
	}

	.done {
		justify-content: center;
		flex: 1;
		gap: 14px;
		text-align: center;
		align-items: center;
	}

	/* ── Welcome hero illustration ── */
	.hero {
		width: 100%;
		display: grid;
		place-items: center;
		padding: 8px 0 4px;
	}

	.hero-svg {
		display: block;
		filter: drop-shadow(0 8px 24px color-mix(in oklab, var(--color-ember) 25%, transparent));
		animation: hero-rise 600ms cubic-bezier(0.32, 0.72, 0, 1) both;
	}

	@keyframes hero-rise {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.steam {
		animation: steam 4s ease-in-out infinite;
		transform-origin: 120px 92px;
	}

	@keyframes steam {
		0%,
		100% {
			opacity: 0.4;
			transform: translateY(0);
		}
		50% {
			opacity: 0.65;
			transform: translateY(-3px);
		}
	}

	.welcome .onb-title {
		max-width: 12ch;
	}

	.welcome .onb-desc {
		max-width: 32ch;
	}

	/* ── Feature cards (welcome) ── */
	.feature-cards {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		margin-top: 10px;
	}

	.fc {
		display: grid;
		grid-template-columns: 32px 1fr;
		gap: 12px;
		align-items: center;
		padding: 10px 12px;
		background: color-mix(in oklab, var(--color-surface-1) 70%, transparent);
		border: 1px solid var(--color-border-subtle);
		border-radius: 14px;
		text-align: left;
		animation: fc-fade 500ms ease-out both;
	}

	.fc:nth-child(1) {
		animation-delay: 80ms;
	}
	.fc:nth-child(2) {
		animation-delay: 160ms;
	}
	.fc:nth-child(3) {
		animation-delay: 240ms;
	}

	@keyframes fc-fade {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.fc-icon {
		width: 32px;
		height: 32px;
		border-radius: 10px;
		display: grid;
		place-items: center;
		background: color-mix(in oklab, var(--color-ember) 12%, var(--color-bg-0));
		color: var(--color-ember-deep);
	}

	.fc-text {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.fc-title {
		font-size: 13.5px;
		font-weight: 500;
		color: var(--color-text-primary);
		letter-spacing: -0.005em;
	}

	.fc-body {
		font-size: 12px;
		color: var(--color-text-muted);
		line-height: 1.4;
	}

	/* ── Done illustration ── */
	.done-illust {
		margin-bottom: 6px;
		filter: drop-shadow(0 14px 28px color-mix(in oklab, var(--color-ember) 60%, transparent));
		animation: hero-rise 500ms cubic-bezier(0.32, 0.72, 0, 1) both;
	}

	/* ── Heads / titles ── */
	.step-head {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.eyebrow {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--color-text-faint);
	}

	.onb-title {
		font-family: var(--font-display);
		font-variation-settings:
			'opsz' 96,
			'SOFT' 80,
			'wght' 470;
		font-size: clamp(28px, 7vw, 36px);
		line-height: 1.05;
		letter-spacing: -0.03em;
		margin: 0;
		color: var(--color-text-primary);
	}

	.onb-desc {
		font-size: 14.5px;
		line-height: 1.5;
		color: var(--color-text-muted);
		margin: 0;
		max-width: 38ch;
	}

	/* ── Track step ── */
	.track-grid {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.track-opt {
		all: unset;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px 16px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: 16px;
		position: relative;
		transition: all 200ms cubic-bezier(0.32, 0.72, 0, 1);
	}

	.track-opt:active {
		transform: scale(0.99);
	}

	.track-opt.selected {
		border-color: var(--color-ember);
		background: color-mix(in oklab, var(--color-ember) 4%, var(--color-surface-1));
	}

	.track-opt.selected::before {
		content: '';
		position: absolute;
		left: -1px;
		top: 16px;
		bottom: 16px;
		width: 3px;
		border-radius: 999px;
		background: var(--color-ember);
	}

	.to-head {
		display: grid;
		grid-template-columns: auto 1fr 22px;
		gap: 10px;
		align-items: center;
	}

	.to-num {
		font-family: var(--font-mono);
		font-size: 10.5px;
		letter-spacing: 0.05em;
		color: var(--color-text-faint);
	}

	.to-title {
		font-family: var(--font-display);
		font-variation-settings:
			'opsz' 36,
			'SOFT' 70,
			'wght' 470;
		font-size: 19px;
		letter-spacing: -0.015em;
		color: var(--color-text-primary);
	}

	.to-check {
		width: 22px;
		height: 22px;
		border-radius: 999px;
		border: 1.5px solid var(--color-border-strong);
		display: grid;
		place-items: center;
		color: var(--color-bg-0);
		background: transparent;
		transition: all 200ms;
	}

	.track-opt.selected .to-check {
		background: var(--color-ember);
		border-color: var(--color-ember);
	}

	.to-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}

	.m-pill {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 8px 2px 6px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--m) 9%, var(--color-bg-0));
		color: color-mix(in oklab, var(--m) 75%, var(--color-text-muted));
		font-size: 10.5px;
		font-weight: 500;
	}

	.m-dot {
		width: 4px;
		height: 4px;
		border-radius: 999px;
		background: var(--m);
	}

	.to-for {
		margin: 0;
		font-size: 12.5px;
		line-height: 1.4;
		color: var(--color-text-muted);
	}

	/* ── Method step ── */
	.method-cards {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.method-card {
		all: unset;
		cursor: pointer;
		display: grid;
		grid-template-columns: 44px 1fr 22px;
		gap: 14px;
		align-items: center;
		padding: 14px 16px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: 16px;
		transition: all 200ms;
	}

	.method-card.selected {
		border-color: var(--color-ember);
		background: color-mix(in oklab, var(--color-ember) 4%, var(--color-surface-1));
	}

	.mc-icon-wrap {
		width: 44px;
		height: 44px;
		border-radius: 13px;
		display: grid;
		place-items: center;
	}

	.mc-icon-wrap.accent {
		background: color-mix(in oklab, var(--color-ember) 14%, var(--color-bg-0));
		color: var(--color-ember-deep);
	}

	.mc-icon-wrap.muted {
		background: var(--color-bg-1);
		color: var(--color-text-muted);
	}

	.mc-text {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}

	.mc-title {
		font-family: var(--font-display);
		font-variation-settings:
			'opsz' 36,
			'SOFT' 70,
			'wght' 470;
		font-size: 16.5px;
		letter-spacing: -0.015em;
		color: var(--color-text-primary);
	}

	.mc-body {
		font-size: 12.5px;
		line-height: 1.4;
		color: var(--color-text-muted);
	}

	.mc-check {
		width: 22px;
		height: 22px;
		border-radius: 999px;
		border: 1.5px solid var(--color-border-strong);
		display: grid;
		place-items: center;
		color: var(--color-bg-0);
		background: transparent;
		transition: all 200ms;
	}

	.method-card.selected .mc-check {
		background: var(--color-ember);
		border-color: var(--color-ember);
	}

	/* ── Body step ── */
	.form {
		display: flex;
		flex-direction: column;
		gap: 22px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 8px;
		border: none;
		padding: 0;
		margin: 0;
	}

	.f-label {
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
		font-weight: 500;
		padding: 0;
	}

	.seg {
		display: flex;
		gap: 4px;
		padding: 4px;
		background: var(--color-bg-1);
		border-radius: 12px;
	}

	.seg-btn {
		all: unset;
		flex: 1;
		text-align: center;
		padding: 9px 12px;
		border-radius: 9px;
		font-size: 13px;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: all 160ms;
	}

	.seg-btn.on {
		background: var(--color-surface-1);
		color: var(--color-text-primary);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	/* ── Stepper rows ── */
	.stepper-rows {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.stepper-row {
		display: grid;
		grid-template-columns: 88px 1fr;
		align-items: center;
		gap: 14px;
	}

	.sr-label {
		font-size: 13.5px;
		color: var(--color-text-muted);
		font-weight: 500;
	}

	/* ── Slider (activity) ── */
	.slider-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.slider-current {
		font-family: var(--font-display);
		font-variation-settings:
			'opsz' 36,
			'SOFT' 60,
			'wght' 460;
		font-size: 16px;
		letter-spacing: -0.01em;
		color: var(--color-ember-deep);
	}

	.slider {
		appearance: none;
		-webkit-appearance: none;
		width: 100%;
		height: 4px;
		border-radius: 999px;
		background: var(--color-bg-2);
		outline: none;
	}

	.slider::-webkit-slider-thumb {
		appearance: none;
		-webkit-appearance: none;
		width: 22px;
		height: 22px;
		border-radius: 999px;
		background: var(--color-ember);
		border: 3px solid var(--color-bg-0);
		box-shadow: 0 1px 4px var(--color-ember-deep);
		cursor: grab;
	}

	.slider::-moz-range-thumb {
		width: 22px;
		height: 22px;
		border-radius: 999px;
		background: var(--color-ember);
		border: 3px solid var(--color-bg-0);
		box-shadow: 0 1px 4px var(--color-ember-deep);
		cursor: grab;
	}

	.slider-ticks {
		display: flex;
		justify-content: space-between;
		padding: 0 9px;
		margin-top: 4px;
	}

	.tick {
		width: 4px;
		height: 4px;
		border-radius: 999px;
		background: var(--color-border-strong);
	}

	.tick.on {
		background: var(--color-ember);
	}

	.goal-row {
		display: flex;
		gap: 8px;
	}

	.goal-btn {
		all: unset;
		cursor: pointer;
		flex: 1;
		text-align: center;
		padding: 13px 8px;
		border: 1px solid var(--color-border-default);
		border-radius: 14px;
		background: var(--color-surface-1);
		font-size: 13px;
		color: var(--color-text-muted);
		transition: all 200ms;
	}

	.goal-btn.on {
		border-color: var(--color-ember);
		background: color-mix(in oklab, var(--color-ember) 5%, var(--color-surface-1));
		color: var(--color-ember-deep);
	}

	/* ── Targets step ── */
	.hero-target {
		all: unset;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 28px 20px 22px;
		background: color-mix(in oklab, var(--color-ember) 5%, var(--color-surface-1));
		border: 1px solid color-mix(in oklab, var(--color-ember) 22%, var(--color-border-default));
		border-radius: 22px;
		text-align: center;
	}

	.ht-eyebrow {
		font-size: 10px;
		letter-spacing: 0.18em;
		color: var(--color-ember-deep);
		font-weight: 500;
	}

	.ht-num,
	.ht-input {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1;
		font-variation-settings:
			'opsz' 144,
			'SOFT' 90,
			'wght' 480;
		font-size: clamp(60px, 14vw, 84px);
		line-height: 0.92;
		letter-spacing: -0.045em;
		color: var(--color-text-primary);
	}

	.ht-input {
		all: unset;
		text-align: center;
		max-width: 4ch;
	}

	.ht-sub {
		font-size: 11.5px;
		letter-spacing: 0.04em;
		color: var(--color-text-subtle);
	}

	.macro-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.cell {
		all: unset;
		cursor: pointer;
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 13px 16px 13px 18px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: 14px;
		overflow: hidden;
	}

	.cell::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: var(--c);
	}

	.c-label {
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}

	.c-num,
	.c-input {
		font-family: var(--font-display);
		font-feature-settings: 'tnum' 1;
		font-variation-settings:
			'opsz' 60,
			'SOFT' 80,
			'wght' 500;
		font-size: 24px;
		letter-spacing: -0.025em;
		line-height: 1;
		color: var(--color-text-primary);
	}

	.c-input {
		all: unset;
		max-width: 4ch;
	}

	.g {
		font-size: 12px;
		font-variation-settings: 'wght' 420;
		color: var(--color-text-subtle);
		margin-left: 2px;
		letter-spacing: 0;
	}

	.formula-note {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px 16px;
		background: var(--color-bg-1);
		border-radius: 12px;
		font-size: 12px;
		color: var(--color-text-muted);
	}

	.fn-eyebrow {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}

	.fn-text {
		font-size: 12.5px;
		color: var(--color-text-muted);
	}

	/* ── Footer / nav ── */
	.onb-foot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 22px;
		gap: 12px;
	}

	.back-btn {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 13px;
		color: var(--color-text-muted);
		padding: 9px 4px;
	}

	.cta-btn {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 13px 22px;
		background: var(--color-ember);
		color: oklch(98% 0.008 70);
		border-radius: 999px;
		font-size: 14.5px;
		font-weight: 500;
		letter-spacing: -0.005em;
		box-shadow: 0 8px 22px -10px var(--color-ember-deep);
		transition:
			transform 120ms,
			box-shadow 200ms;
	}

	.cta-btn:active {
		transform: scale(0.98);
	}
</style>
