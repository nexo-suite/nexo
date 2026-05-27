<script lang="ts">
	import type { EtaPhrase } from '$lib/utils/weightStats';
	import { m } from '$lib/paraglide/messages.js';

	let {
		hasEnoughData,
		hasTarget,
		atGoal,
		offPace,
		paceKgPerWeek,
		etaPhrase,
		needMoreDays
	}: {
		hasEnoughData: boolean;
		hasTarget: boolean;
		atGoal: boolean;
		offPace: boolean;
		paceKgPerWeek: number | null;
		etaPhrase: EtaPhrase | null;
		needMoreDays: number;
	} = $props();

	function formatPace(kgPerWeek: number): string {
		const abs = Math.abs(kgPerWeek);
		const sign = kgPerWeek < 0 ? '−' : '+';
		return `${sign}${abs.toFixed(2)}`;
	}

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
</script>

<p class="pace">
	{#if atGoal}
		{m.weight_pace_at_goal()}
	{:else if !hasEnoughData}
		{#if needMoreDays > 0}
			{m.weight_pace_need_more({ n: needMoreDays })}
		{/if}
	{:else if !hasTarget}
		{#if paceKgPerWeek != null}
			{#if Math.abs(paceKgPerWeek) < 0.05}
				{m.weight_pace_holding()}
			{:else if paceKgPerWeek < 0}
				{m.weight_pace_losing({ kg: Math.abs(paceKgPerWeek).toFixed(2) })}
			{:else}
				{m.weight_pace_gaining({ kg: paceKgPerWeek.toFixed(2) })}
			{/if}
		{/if}
	{:else if offPace}
		{m.weight_pace_off()}
	{:else if paceKgPerWeek != null && etaPhrase}
		{m.weight_pace_with_eta({
			pace: formatPace(paceKgPerWeek),
			when: whenLabel(etaPhrase)
		})}
	{/if}
</p>

<style>
	.pace {
		font-family: var(--font-display);
		font-variation-settings: 'opsz' 24, 'SOFT' 100, 'wght' 420, 'ital' 1;
		font-style: italic;
		font-size: 14.5px;
		letter-spacing: -0.005em;
		color: var(--color-text-muted);
		margin: 0;
		min-height: 1.5em;
	}
</style>
