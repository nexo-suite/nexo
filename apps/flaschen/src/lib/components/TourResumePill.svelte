<script lang="ts">
	import { onMount } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { Sparkles, X } from '@lucide/svelte';

	const STORAGE_KEY = 'flaschen.onboarded';
	const RESUME_KEY = 'flaschen.tour-resume';
	const MAX_AGE_MS = 24 * 60 * 60 * 1000;

	let visible = $state(false);
	let resumeStep = $state(0);

	function read() {
		try {
			if (localStorage.getItem(STORAGE_KEY)) {
				visible = false;
				return;
			}
			const raw = localStorage.getItem(RESUME_KEY);
			if (!raw) {
				visible = false;
				return;
			}
			const parsed = JSON.parse(raw) as { step?: number; ts?: number } | null;
			if (!parsed || typeof parsed.ts !== 'number' || Date.now() - parsed.ts > MAX_AGE_MS) {
				localStorage.removeItem(RESUME_KEY);
				visible = false;
				return;
			}
			resumeStep = typeof parsed.step === 'number' ? parsed.step : 0;
			visible = true;
		} catch {
			visible = false;
		}
	}

	onMount(() => {
		read();
		const onSet = () => read();
		window.addEventListener('flaschen:tour-resume-set', onSet);
		window.addEventListener('storage', onSet);
		return () => {
			window.removeEventListener('flaschen:tour-resume-set', onSet);
			window.removeEventListener('storage', onSet);
		};
	});

	function resume() {
		visible = false;
		window.dispatchEvent(
			new CustomEvent('flaschen:replay-onboarding', { detail: { step: resumeStep } })
		);
	}

	function dismiss() {
		try {
			localStorage.removeItem(RESUME_KEY);
			localStorage.setItem(STORAGE_KEY, '1');
		} catch {
			// ignore
		}
		visible = false;
	}
</script>

{#if visible}
	<div class="tour-pill-wrap">
		<button type="button" class="tour-pill" onclick={resume}>
			<Sparkles size={14} strokeWidth={1.8} />
			<span>{m.onb_resume()}</span>
		</button>
		<button type="button" class="tour-pill-x" aria-label={m.onb_skip()} onclick={dismiss}>
			<X size={12} strokeWidth={2} />
		</button>
	</div>
{/if}

<style>
	.tour-pill-wrap {
		position: fixed;
		right: 12px;
		bottom: calc(var(--tab-h) + var(--safe-bot, 0px) + 12px);
		z-index: 60;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 4px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--color-accent) 18%, var(--color-bg-1));
		border: 1px solid color-mix(in oklab, var(--color-accent) 30%, transparent);
		box-shadow: 0 8px 24px -12px color-mix(in oklab, var(--color-accent) 60%, transparent);
		animation: tour-pill-in 220ms ease-out;
	}
	@keyframes tour-pill-in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	.tour-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font: inherit;
		font-size: 12.5px;
		font-weight: 600;
		color: var(--color-accent);
		background: transparent;
		border: none;
		padding: 6px 10px 6px 12px;
		border-radius: 999px;
		cursor: pointer;
	}
	.tour-pill:active {
		opacity: 0.85;
	}
	.tour-pill-x {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--color-accent) 14%, transparent);
		color: var(--color-accent);
		border: none;
		cursor: pointer;
	}
	.tour-pill-x:active {
		opacity: 0.85;
	}
</style>
