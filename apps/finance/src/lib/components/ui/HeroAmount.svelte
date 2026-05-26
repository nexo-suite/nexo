<script lang="ts">
	import { getIntlLocale } from '$lib/utils';
	import { m } from '$lib/paraglide/messages.js';

	let {
		value = $bindable(''),
		currency = 'EUR',
		tone = 'expense',
		name = 'amount',
		helper = '',
		placeholder = '0',
		autofocus = false
	}: {
		value: string;
		currency?: string;
		tone?: 'expense' | 'income' | 'debt';
		name?: string;
		helper?: string;
		placeholder?: string;
		autofocus?: boolean;
	} = $props();

	const TONE_INK: Record<string, string> = {
		expense: 'var(--expense-ink)',
		income: 'var(--income-ink)',
		debt: 'var(--debt-ink)'
	};

	const TONE_GLOW: Record<string, string> = {
		expense: 'color-mix(in oklab, var(--color-expense) 14%, transparent)',
		income: 'color-mix(in oklab, var(--color-income) 14%, transparent)',
		debt: 'color-mix(in oklab, var(--color-debt) 14%, transparent)'
	};

	const currencySymbol = $derived(
		new Intl.NumberFormat(getIntlLocale(), { style: 'currency', currency })
			.formatToParts(0)
			.find((p) => p.type === 'currency')?.value ?? '€'
	);

	let inputEl: HTMLInputElement | null = $state(null);

	$effect(() => {
		if (autofocus && inputEl) {
			// Small delay so BottomSheet animation finishes
			setTimeout(() => inputEl?.focus(), 220);
		}
	});

	function handleInput(e: Event) {
		const t = e.target as HTMLInputElement;
		// Allow numbers, comma, dot — strip everything else
		const cleaned = t.value.replace(/[^0-9.,]/g, '').replace(/,/g, '.');
		// Single decimal point only
		const parts = cleaned.split('.');
		const sane = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}` : cleaned;
		value = sane;
	}
</script>

<div class="hero" style="--tone-ink: {TONE_INK[tone]}; --tone-glow: {TONE_GLOW[tone]};">
	<div class="hero-glow" aria-hidden="true"></div>
	<div class="hero-row">
		<span class="hero-cur">{currencySymbol}</span>
		<input
			bind:this={inputEl}
			{name}
			value={value}
			oninput={handleInput}
			type="text"
			inputmode="decimal"
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
			class="hero-input"
			{placeholder}
			aria-label={m.hero_amount_aria()}
		/>
	</div>
	<div class="hero-helper">
		{#if helper}
			<span class="hero-helper-text">{helper}</span>
		{:else}
			<span class="hero-helper-text hero-helper-faint">{m.hero_amount_helper_default()}</span>
		{/if}
	</div>
</div>

<style>
	.hero {
		position: relative;
		isolation: isolate;
		padding: 22px 18px 16px;
		border-radius: var(--radius-xl);
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-subtle);
		overflow: hidden;
		margin-bottom: 14px;
	}
	.hero-glow {
		position: absolute;
		inset: -40% -20% auto auto;
		width: 70%;
		height: 200%;
		background: radial-gradient(circle at 70% 30%, var(--tone-glow), transparent 60%);
		pointer-events: none;
		z-index: -1;
	}
	.hero-row {
		display: flex;
		align-items: baseline;
		gap: 6px;
	}
	.hero-cur {
		font-family: var(--font-sans);
		font-size: 26px;
		font-weight: 500;
		color: color-mix(in oklab, var(--tone-ink) 60%, var(--color-text-muted));
		letter-spacing: -0.01em;
	}
	.hero-input {
		flex: 1;
		min-width: 0;
		font-family: var(--font-sans);
		font-size: 44px;
		font-weight: 600;
		letter-spacing: -0.035em;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		color: var(--tone-ink);
		background: transparent;
		border: 0;
		outline: none;
		padding: 0;
	}
	.hero-input::placeholder {
		color: color-mix(in oklab, var(--tone-ink) 25%, var(--color-text-faint));
		opacity: 0.5;
	}
	.hero-helper {
		margin-top: 6px;
		min-height: 16px;
	}
	.hero-helper-text {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.04em;
		color: color-mix(in oklab, var(--tone-ink) 65%, var(--color-text-muted));
		font-variant-numeric: tabular-nums;
	}
	.hero-helper-faint {
		color: var(--color-text-faint);
	}
</style>
