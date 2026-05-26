<script lang="ts">
	import type { UpcomingEvent } from '$lib/types';
	import { getIntlLocale } from '$lib/utils';
	import { m } from '$lib/paraglide/messages.js';

	let {
		event,
		currency,
		hideCents = false,
		context
	}: {
		event: UpcomingEvent | null;
		currency: string;
		hideCents?: boolean;
		context?: string;
	} = $props();

	function fmt(n: number) {
		return new Intl.NumberFormat(getIntlLocale(), {
			style: 'currency',
			currency,
			minimumFractionDigits: hideCents ? 0 : 2,
			maximumFractionDigits: hideCents ? 0 : 2
		}).format(n);
	}

	const TYPE_STYLES: Record<
		string,
		{ ink: string; soft: string; line: string; emoji: string; label: string; sign: string }
	> = $derived({
		expense: {
			ink: 'var(--expense-ink)',
			soft: 'var(--expense-soft)',
			line: 'var(--expense-line)',
			emoji: '💸',
			label: m.spotlight_label_expense(),
			sign: '-'
		},
		income: {
			ink: 'var(--income-ink)',
			soft: 'var(--income-soft)',
			line: 'var(--income-line)',
			emoji: '💰',
			label: m.spotlight_label_income(),
			sign: '+'
		},
		debt: {
			ink: 'var(--debt-ink)',
			soft: 'var(--debt-soft)',
			line: 'var(--debt-line)',
			emoji: '🤝',
			label: m.spotlight_label_debt(),
			sign: ''
		}
	});

	const style = $derived(
		event ? (TYPE_STYLES[event.type] ?? TYPE_STYLES['expense']) : TYPE_STYLES['expense']
	);
</script>

{#if event}
	<div
		class="bg-surface-1 relative overflow-hidden rounded-[var(--radius-xl)] border"
		style="padding: 16px 18px; border-color: {style.line};"
	>
		<!-- Atmospheric wash -->
		<div
			class="pointer-events-none absolute inset-0"
			style="background:
				radial-gradient(circle at 0% 50%, {style.soft} 0%, transparent 55%),
				radial-gradient(circle at 100% 100%, color-mix(in oklab, {style.ink} 8%, transparent) 0%, transparent 60%);
				opacity: 0.95;"
		></div>

		<!-- Tag -->
		<div class="relative flex items-center gap-2">
			<span class="text-[18px] leading-none" aria-hidden="true">{style.emoji}</span>
			<span
				class="mono text-[10px] font-semibold tracking-[0.14em] uppercase"
				style="color: {style.ink};"
			>
				{m.spotlight_hits_today({ label: style.label })}
			</span>
		</div>

		<!-- Name + amount row -->
		<div class="relative mt-2 flex items-end justify-between gap-3">
			<p class="text-text-primary min-w-0 truncate text-[18px] font-semibold tracking-tight">
				{event.label}
			</p>
			<p
				class="shrink-0 text-[20px] font-semibold tracking-tight tabular-nums"
				style="color: {style.ink};"
			>
				{style.sign}{fmt(event.amount)}
			</p>
		</div>

		{#if context}
			<p class="text-text-muted relative mt-1 text-[12.5px]">{context}</p>
		{/if}
	</div>
{/if}
