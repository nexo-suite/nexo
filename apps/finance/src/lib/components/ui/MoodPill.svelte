<script lang="ts">
	import { getIntlLocale } from '$lib/utils';
	import { m } from '$lib/paraglide/messages.js';

	type Tone = 'good' | 'steady' | 'watch' | 'tight' | 'alert';

	let {
		liquidBalance,
		lowestValue,
		lowestDate,
		endValue,
		size = 'md'
	}: {
		liquidBalance: number;
		lowestValue: number;
		lowestDate?: string;
		endValue: number;
		size?: 'sm' | 'md';
	} = $props();

	type Mood = { emoji: string; label: string; tone: Tone };

	const mood = $derived.by<Mood>(() => {
		const delta = endValue - liquidBalance;
		const ratio = liquidBalance > 0 ? lowestValue / liquidBalance : lowestValue >= 0 ? 1 : -1;

		if (lowestValue < 0) {
			if (delta < -liquidBalance * 0.25) return { emoji: '🌪️', label: m.mood_alert(), tone: 'alert' };
			return { emoji: '⛈️', label: m.mood_tight(), tone: 'tight' };
		}
		if (ratio < 0.25) return { emoji: '⛅', label: m.mood_watch(), tone: 'watch' };
		if (delta < 0) return { emoji: '🌤️', label: m.mood_trickling(), tone: 'watch' };
		if (delta < liquidBalance * 0.05) return { emoji: '☀️', label: m.mood_steady(), tone: 'steady' };
		return { emoji: '🌞', label: m.mood_good(), tone: 'good' };
	});

	const TONE_STYLE: Record<Tone, { bg: string; ink: string; line: string }> = {
		good: {
			bg: 'var(--income-soft)',
			ink: 'var(--income-ink)',
			line: 'color-mix(in oklab, var(--color-income) 28%, var(--color-border-default))'
		},
		steady: {
			bg: 'var(--accent-soft)',
			ink: 'var(--accent-ink)',
			line: 'color-mix(in oklab, var(--color-accent) 22%, var(--color-border-default))'
		},
		watch: {
			bg: 'var(--debt-soft)',
			ink: 'var(--debt-ink)',
			line: 'color-mix(in oklab, var(--color-debt) 25%, var(--color-border-default))'
		},
		tight: {
			bg: 'var(--expense-soft)',
			ink: 'var(--expense-ink)',
			line: 'color-mix(in oklab, var(--color-expense) 28%, var(--color-border-default))'
		},
		alert: {
			bg: 'var(--expense-soft)',
			ink: 'var(--expense-ink)',
			line: 'var(--color-expense)'
		}
	};

	const style = $derived(TONE_STYLE[mood.tone]);

	function fmtTrough(d: string | undefined) {
		if (!d) return '';
		const date = new Date(d);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const days = Math.round((date.getTime() - today.getTime()) / 86400000);
		if (days <= 0) return m.mood_lowest_today();
		if (days === 1) return m.mood_lowest_tomorrow();
		if (days < 14) return m.mood_lowest_in_days({ count: days });
		return m.mood_lowest_on({
			date: date.toLocaleDateString(getIntlLocale(), { day: 'numeric', month: 'short' })
		});
	}

	const subtext = $derived(
		mood.tone === 'tight' || mood.tone === 'alert' || mood.tone === 'watch'
			? m.mood_subtext_lowest({ when: fmtTrough(lowestDate) })
			: ''
	);
</script>

<span
	class="mood-pill"
	class:mood-sm={size === 'sm'}
	style="background: {style.bg}; color: {style.ink}; border-color: {style.line};"
>
	<span class="mood-emoji" aria-hidden="true">{mood.emoji}</span>
	<span class="mood-label">{mood.label}</span>
	{#if subtext && size !== 'sm'}
		<span class="mood-sub">· {subtext}</span>
	{/if}
</span>

<style>
	.mood-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 10px 5px 8px;
		border-radius: 999px;
		border: 1px solid;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: -0.005em;
		line-height: 1;
		white-space: nowrap;
	}
	.mood-sm {
		padding: 3px 8px 3px 6px;
		font-size: 11px;
		gap: 4px;
	}
	.mood-emoji {
		font-size: 14px;
		line-height: 1;
		filter: saturate(1.1);
	}
	.mood-sm .mood-emoji {
		font-size: 12px;
	}
	.mood-sub {
		font-weight: 500;
		opacity: 0.78;
	}
</style>
