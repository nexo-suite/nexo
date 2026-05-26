<script lang="ts">
	import { Sparkles } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import {
		AboutDiagnostics,
		PageHeader,
		ProfileHubCard,
		SectionLabel,
		SettingsCard
	} from '@nexo/ui';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import type { MacroTier } from '$lib/types';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const profile = $derived(data.profile);
	const targets = $derived(data.targets);
	const logline = $derived(data.logline);

	let tier = $state<MacroTier>(untrack(() => data.tier));

	const tierOpts: { id: MacroTier; label: () => string }[] = [
		{ id: 'basic', label: m.tier_basic },
		{ id: 'extended', label: m.tier_extended },
		{ id: 'full', label: m.tier_full }
	];

	const hubUrl = 'https://krieger2501.de/apps';

	const appMeta = {
		appName: 'Nexo Calorie',
		appKey: 'calorie',
		version: typeof __APP_VERSION_FALLBACK__ !== 'undefined' ? __APP_VERSION_FALLBACK__ : 'dev',
		commit: typeof __APP_COMMIT_FALLBACK__ !== 'undefined' ? __APP_COMMIT_FALLBACK__ : 'dev',
		buildTime:
			typeof __APP_BUILD_TIME_FALLBACK__ !== 'undefined'
				? __APP_BUILD_TIME_FALLBACK__
				: new Date().toISOString()
	};
</script>

<div class="page">
	<PageHeader title={m.nav_settings()} subtitle={m.app_tagline()}>
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
	</PageHeader>

	<ProfileHubCard
		name={data.hubProfile.name}
		email={data.hubProfile.email}
		displayName={data.hubProfile.displayName ?? data.hubProfile.name}
		{hubUrl}
		language={data.hubProfile.language}
		weekStarts={data.hubProfile.weekStartDay === 'sunday' ? 'Sunday' : 'Monday'}
		theme={data.hubProfile.theme}
	/>

	<!-- ─── Logline — gentle generated title from food patterns ─── -->
	<button class="logline-card" type="button" aria-label="What this means">
		<span class="ll-eyebrow">{m.profile_logline_eyebrow()}</span>
		<span class="ll-title">{logline}</span>
		<span class="ll-hint">{m.profile_logline_hint()}</span>
	</button>

	<!-- ─── Targets ─── -->
	<SectionLabel title="Targets" subtitle="daily kcal & macros" />
	<SettingsCard>
		<div class="target-row" role="button" tabindex="0">
			<div class="t-block">
				<span class="t-label">{m.unit_kcal().toUpperCase()}</span>
				<span class="t-num">{targets.kcal.toLocaleString()}</span>
			</div>
			<div class="t-divider"></div>
			<div class="t-macros">
				<div class="tm" style="--c:var(--color-protein)">
					<span class="tm-l">P</span>
					<span class="tm-v">{targets.protein_g}<span class="g">g</span></span>
				</div>
				<div class="tm" style="--c:var(--color-carbs)">
					<span class="tm-l">C</span>
					<span class="tm-v">{targets.carbs_g}<span class="g">g</span></span>
				</div>
				<div class="tm" style="--c:var(--color-fat)">
					<span class="tm-l">F</span>
					<span class="tm-v">{targets.fat_g}<span class="g">g</span></span>
				</div>
			</div>
		</div>
	</SettingsCard>

	<!-- ─── Macro tier ─── -->
	<SectionLabel title="Macro detail" subtitle="how much to track" />
	<SettingsCard>
		<div class="tier-switcher">
			{#each tierOpts as t (t.id)}
				<button
					class="tier-opt"
					class:on={tier === t.id}
					type="button"
					onclick={() => (tier = t.id)}
				>
					{t.label()}
				</button>
			{/each}
		</div>
	</SettingsCard>

	<!-- ─── Body ─── -->
	<SectionLabel title="Body" subtitle="used to calculate targets" />
	<SettingsCard>
		<div class="body-grid">
			<div class="b-cell">
				<span class="b-l">{m.profile_age()}</span>
				<span class="b-v">{profile?.age ?? '—'}</span>
			</div>
			<div class="b-cell">
				<span class="b-l">{m.profile_height()}</span>
				<span class="b-v">{profile?.heightCm ?? '—'}<span class="g">cm</span></span>
			</div>
			<div class="b-cell">
				<span class="b-l">{m.profile_weight()}</span>
				<span class="b-v">{profile?.weightKg ?? '—'}<span class="g">kg</span></span>
			</div>
		</div>
	</SettingsCard>

	<!-- ─── Recipes coming-soon ─── -->
	<div class="recipes-card">
		<div class="rc-icon" aria-hidden="true">
			<Sparkles size={14} strokeWidth={1.7} />
		</div>
		<div class="rc-text">
			<div class="rc-title">{m.profile_recipes_coming_title()}</div>
			<div class="rc-body">{m.profile_recipes_coming_body()}</div>
		</div>
	</div>

	<!-- ─── About ─── -->
	<AboutDiagnostics
		appName={appMeta.appName}
		appKey={appMeta.appKey}
		version={appMeta.version}
		commit={appMeta.commit}
		buildTime={appMeta.buildTime}
	/>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		padding: 16px 16px 28px;
	}

	/* ── Logline card ── */
	.logline-card {
		all: unset;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 14px 18px;
		margin: 12px 0 4px;
		background: linear-gradient(
			135deg,
			color-mix(in oklab, var(--color-ember) 8%, var(--color-surface-1)) 0%,
			var(--color-surface-1) 60%
		);
		border: 1px solid color-mix(in oklab, var(--color-ember) 22%, var(--color-border-default));
		border-radius: 16px;
		position: relative;
		overflow: hidden;
	}

	.logline-card::after {
		content: '';
		position: absolute;
		right: -32px;
		top: -32px;
		width: 110px;
		height: 110px;
		border-radius: 999px;
		background: radial-gradient(
			circle,
			color-mix(in oklab, var(--color-ember) 18%, transparent),
			transparent 70%
		);
		pointer-events: none;
	}

	.ll-eyebrow {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-ember-deep);
		opacity: 0.85;
	}

	.ll-title {
		font-family: var(--font-display);
		font-variation-settings:
			'opsz' 60,
			'SOFT' 80,
			'wght' 480;
		font-size: 22px;
		line-height: 1.05;
		letter-spacing: -0.02em;
		color: var(--color-text-primary);
		font-style: italic;
	}

	.ll-hint {
		font-size: 11.5px;
		color: var(--color-text-subtle);
	}

	/* ── Targets card ── */
	.target-row {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 16px 18px;
		cursor: pointer;
	}

	.t-block {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.t-label {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.18em;
		color: var(--color-text-subtle);
		font-weight: 500;
	}

	.t-num {
		font-feature-settings: 'tnum' 1;
		font-variant-numeric: tabular-nums;
		font-size: 28px;
		font-weight: 600;
		letter-spacing: -0.025em;
		color: var(--color-text-primary);
		line-height: 1;
	}

	.t-divider {
		width: 1px;
		height: 32px;
		background: var(--color-border-default);
	}

	.t-macros {
		display: flex;
		gap: 14px;
		flex: 1;
	}

	.tm {
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.tm-l {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.16em;
		color: var(--c);
		font-weight: 600;
	}

	.tm-v {
		font-feature-settings: 'tnum' 1;
		font-variant-numeric: tabular-nums;
		font-size: 17px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.g {
		font-size: 11px;
		font-weight: 400;
		color: var(--color-text-subtle);
		margin-left: 1px;
	}

	/* ── Tier switcher ── */
	.tier-switcher {
		display: flex;
		gap: 4px;
		padding: 6px;
		background: var(--color-bg-1);
	}

	.tier-opt {
		all: unset;
		flex: 1;
		text-align: center;
		padding: 9px 12px;
		border-radius: 10px;
		font-size: 13px;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: all 160ms;
	}

	.tier-opt.on {
		background: var(--color-surface-1);
		color: var(--color-text-primary);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
	}

	/* ── Body grid ── */
	.body-grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		padding: 16px 18px;
	}

	.b-cell {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding-right: 12px;
		border-right: 1px solid var(--color-border-subtle);
	}

	.b-cell:last-child {
		border-right: none;
		padding-right: 0;
	}

	.b-cell:not(:first-child) {
		padding-left: 14px;
	}

	.b-l {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}

	.b-v {
		font-feature-settings: 'tnum' 1;
		font-variant-numeric: tabular-nums;
		font-size: 24px;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--color-text-primary);
		line-height: 1;
	}

	/* ── Recipes coming-soon ── */
	.recipes-card {
		display: grid;
		grid-template-columns: 28px 1fr;
		gap: 12px;
		padding: 16px 18px;
		background: linear-gradient(
			135deg,
			color-mix(in oklab, var(--color-ember) 6%, var(--color-surface-1)),
			var(--color-surface-1)
		);
		border: 1px solid color-mix(in oklab, var(--color-ember) 22%, var(--color-border-default));
		border-radius: var(--radius-xl, 20px);
		position: relative;
		overflow: hidden;
		margin-top: 22px;
	}

	.recipes-card::after {
		content: '';
		position: absolute;
		right: -40px;
		top: -40px;
		width: 140px;
		height: 140px;
		border-radius: 999px;
		background: radial-gradient(
			circle,
			color-mix(in oklab, var(--color-ember) 14%, transparent),
			transparent 70%
		);
		pointer-events: none;
	}

	.rc-icon {
		width: 28px;
		height: 28px;
		border-radius: 999px;
		background: var(--color-ember);
		color: oklch(98% 0.008 70);
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.rc-text {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}

	.rc-title {
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.015em;
		color: var(--color-text-primary);
	}

	.rc-body {
		font-size: 13px;
		line-height: 1.5;
		color: var(--color-text-muted);
	}
</style>
