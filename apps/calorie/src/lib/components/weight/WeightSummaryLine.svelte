<script lang="ts">
	import type { EtaPhrase } from '$lib/utils/weightStats';
	import { m } from '$lib/paraglide/messages.js';

	let {
		startKg,
		latestKg,
		latestDate,
		targetKg,
		paceKgPerWeek,
		hasEnoughData,
		atGoal,
		offPace,
		etaPhrase,
		needMoreDays
	}: {
		startKg: number | null;
		latestKg: number | null;
		latestDate: string | null;
		targetKg: number | null;
		paceKgPerWeek: number | null;
		hasEnoughData: boolean;
		atGoal: boolean;
		offPace: boolean;
		etaPhrase: EtaPhrase | null;
		needMoreDays: number;
	} = $props();

	const startMonth = $derived.by(() => {
		if (!latestDate || startKg == null) return null;
		try {
			return new Intl.DateTimeFormat('en', { month: 'short' }).format(
				new Date(`${latestDate}T00:00:00Z`)
			);
		} catch {
			return null;
		}
	});

	const delta = $derived(latestKg != null && startKg != null ? latestKg - startKg : null);

	function whenLabel(p: EtaPhrase): string {
		switch (p.kind) {
			case 'this_week':
				return m.weight_eta_this_week();
			case 'next_week':
				return m.weight_eta_next_week();
			case 'short_date':
			case 'past':
				return p.absolute;
			case 'phase_month':
				if (p.phase === 'early') return m.weight_eta_early({ month: p.month });
				if (p.phase === 'mid') return m.weight_eta_mid({ month: p.month });
				return m.weight_eta_late({ month: p.month });
		}
	}

	const paceWord = $derived.by(() => {
		if (paceKgPerWeek == null) return null;
		if (Math.abs(paceKgPerWeek) < 0.05) return m.weight_summary_holding();
		if (paceKgPerWeek < 0)
			return m.weight_summary_losing({ kg: Math.abs(paceKgPerWeek).toFixed(2) });
		return m.weight_summary_gaining({ kg: paceKgPerWeek.toFixed(2) });
	});
</script>

<p class="line">
	{#if latestKg == null}
		<em class="hint">{m.weight_summary_first_log()}</em>
	{:else if atGoal}
		<em class="goal">{m.weight_summary_at_goal()}</em>
	{:else}
		{#if delta != null && Math.abs(delta) >= 0.1}
			<span class="seg" class:down={delta < 0} class:up={delta > 0}>
				{delta < 0 ? '−' : '+'}{Math.abs(delta).toFixed(1)} kg
			</span>
			{#if startMonth}
				<em class="seg meta">{m.weight_summary_since({ month: startMonth })}</em>
			{/if}
			<span class="dot" aria-hidden="true">·</span>
		{/if}

		{#if !hasEnoughData}
			{#if needMoreDays > 0}
				<em class="seg meta">{m.weight_pace_need_more({ n: needMoreDays })}</em>
			{:else}
				<em class="seg meta">{m.weight_summary_settling()}</em>
			{/if}
		{:else if paceWord}
			<em class="seg meta">{paceWord}</em>
		{/if}

		{#if hasEnoughData && targetKg != null && !atGoal}
			<span class="dot" aria-hidden="true">·</span>
			{#if offPace}
				<em class="seg meta off">{m.weight_summary_off_pace()}</em>
			{:else if etaPhrase}
				<em class="seg meta">
					{m.weight_summary_arriving({ kg: targetKg.toFixed(1), when: whenLabel(etaPhrase) })}
				</em>
			{/if}
		{/if}
	{/if}
</p>

<style>
	.line {
		margin: 0;
		padding: 2px 0 0;
		font-family: var(--font-display);
		font-variation-settings:
			'opsz' 22,
			'SOFT' 100,
			'wght' 420;
		font-size: 14px;
		line-height: 1.45;
		letter-spacing: -0.005em;
		color: var(--color-text-muted);
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 6px;
		min-height: 1.5em;
	}

	.seg {
		font-style: normal;
	}

	em.seg,
	em.hint,
	em.goal {
		font-style: italic;
		font-variation-settings:
			'opsz' 22,
			'SOFT' 100,
			'wght' 420,
			'ital' 1;
	}

	.seg.down {
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variant-numeric: tabular-nums lining-nums;
		color: var(--color-ontarget);
		font-style: normal;
		font-variation-settings:
			'opsz' 22,
			'SOFT' 80,
			'wght' 460;
	}

	.seg.up {
		font-feature-settings: 'tnum' 1, 'lnum' 1;
		font-variant-numeric: tabular-nums lining-nums;
		color: var(--color-overtarget);
		font-style: normal;
		font-variation-settings:
			'opsz' 22,
			'SOFT' 80,
			'wght' 460;
	}

	.seg.meta {
		color: var(--color-text-subtle);
	}

	.seg.off {
		color: color-mix(in oklab, var(--color-overtarget) 75%, var(--color-text-muted));
	}

	.goal {
		color: var(--color-ontarget);
		font-variation-settings:
			'opsz' 22,
			'SOFT' 100,
			'wght' 460,
			'ital' 1;
	}

	.hint {
		color: var(--color-text-faint);
	}

	.dot {
		color: var(--color-text-faint);
		opacity: 0.55;
	}
</style>
