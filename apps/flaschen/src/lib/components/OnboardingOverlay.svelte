<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { m } from '$lib/paraglide/messages.js';
	import {
		Sparkles,
		Plug,
		SlidersHorizontal,
		Bell,
		PartyPopper,
		ArrowRight,
		ArrowLeft,
		X
	} from '@lucide/svelte';

	const STORAGE_KEY = 'flaschen.onboarded';
	const RESUME_KEY = 'flaschen.tour-resume';
	type Connection = 'connected' | 'never' | 'reconnect';
	let { connection }: { connection: Connection } = $props();

	let open = $state(false);
	let step = $state(0);
	const totalSteps = 5;

	onMount(() => {
		try {
			const seen = localStorage.getItem(STORAGE_KEY);
			if (!seen) open = true;
		} catch {
			// localStorage may be unavailable in some embedded contexts; don't auto-open then.
		}
		const handler = (e: Event) => {
			const detail = (e as CustomEvent<{ step?: number } | undefined>).detail;
			step = typeof detail?.step === 'number' ? detail.step : 0;
			open = true;
		};
		window.addEventListener('flaschen:replay-onboarding', handler);
		return () => window.removeEventListener('flaschen:replay-onboarding', handler);
	});

	function markSeen() {
		try {
			localStorage.setItem(STORAGE_KEY, '1');
			localStorage.removeItem(RESUME_KEY);
		} catch {
			// ignore
		}
	}

	function close() {
		markSeen();
		open = false;
	}

	function next() {
		if (step >= totalSteps - 1) {
			close();
		} else {
			step += 1;
		}
	}

	function back() {
		if (step > 0) step -= 1;
	}

	function jumpTo(href: string) {
		const nextStep = Math.min(step + 1, totalSteps - 1);
		try {
			localStorage.setItem(RESUME_KEY, JSON.stringify({ step: nextStep, ts: Date.now() }));
		} catch {
			// ignore
		}
		open = false;
		window.dispatchEvent(new CustomEvent('flaschen:tour-resume-set'));
		void goto(href);
	}
</script>

{#if open}
	<div class="onb" role="dialog" aria-modal="true" aria-labelledby="onb-title">
		<button type="button" class="onb-close" aria-label={m.onb_skip()} onclick={close}>
			<X size={18} strokeWidth={1.8} />
		</button>

		<div class="onb-progress" aria-hidden="true">
			{#each Array.from({ length: totalSteps }, (_, i) => i) as i (i)}
				<span class="onb-pip" class:active={i === step} class:done={i < step}></span>
			{/each}
		</div>

		<div class="onb-body">
			{#if step === 0}
				<div class="onb-illust onb-illust-accent">
					<Sparkles size={36} strokeWidth={1.4} />
				</div>
				<h2 id="onb-title" class="onb-title">{m.onb_step_1_title()}</h2>
				<p class="onb-desc">{m.onb_step_1_desc()}</p>
			{:else if step === 1}
				<div class="onb-illust onb-illust-accent">
					<Plug size={32} strokeWidth={1.5} />
				</div>
				<h2 id="onb-title" class="onb-title">{m.onb_step_2_title()}</h2>
				<p class="onb-desc">{m.onb_step_2_desc()}</p>
				<div class="onb-actions-stack">
					{#if connection === 'connected'}
						<button type="button" class="onb-cta" onclick={next}>
							{m.onb_next()}
							<ArrowRight size={16} strokeWidth={2} />
						</button>
					{:else}
						<button type="button" class="onb-cta" onclick={() => jumpTo('/settings?connect=1')}>
							{m.onb_step_2_cta()}
							<ArrowRight size={16} strokeWidth={2} />
						</button>
						<button type="button" class="onb-link" onclick={next}>
							{m.onb_step_2_skip()}
						</button>
					{/if}
				</div>
			{:else if step === 2}
				<div class="onb-illust onb-illust-accent">
					<SlidersHorizontal size={32} strokeWidth={1.5} />
				</div>
				<h2 id="onb-title" class="onb-title">{m.onb_step_3_title()}</h2>
				<p class="onb-desc">{m.onb_step_3_desc()}</p>
				<div class="onb-actions-stack">
					<button type="button" class="onb-cta" onclick={() => jumpTo('/filters')}>
						{m.onb_step_3_cta()}
						<ArrowRight size={16} strokeWidth={2} />
					</button>
					<button type="button" class="onb-link" onclick={next}>{m.onb_skip()}</button>
				</div>
			{:else if step === 3}
				<div class="onb-illust onb-illust-accent">
					<Bell size={32} strokeWidth={1.5} />
				</div>
				<h2 id="onb-title" class="onb-title">{m.onb_step_4_title()}</h2>
				<p class="onb-desc">{m.onb_step_4_desc()}</p>
				<div class="onb-actions-stack">
					<button type="button" class="onb-cta" onclick={() => jumpTo('/devices')}>
						{m.onb_step_4_cta()}
						<ArrowRight size={16} strokeWidth={2} />
					</button>
					<button type="button" class="onb-link" onclick={next}>{m.onb_skip()}</button>
				</div>
			{:else}
				<div class="onb-illust onb-illust-accent">
					<PartyPopper size={36} strokeWidth={1.4} />
				</div>
				<h2 id="onb-title" class="onb-title">{m.onb_step_5_title()}</h2>
				<p class="onb-desc">{m.onb_step_5_desc()}</p>
			{/if}
		</div>

		<div class="onb-nav">
			{#if step > 0}
				<button type="button" class="onb-back" onclick={back}>
					<ArrowLeft size={14} strokeWidth={2} />
					{m.onb_back()}
				</button>
			{:else}
				<span></span>
			{/if}

			{#if step === totalSteps - 1}
				<button type="button" class="onb-cta onb-cta-done" onclick={close}>{m.onb_done()}</button>
			{:else if step !== 1 && step !== 2 && step !== 3}
				<!-- Step 0 only — middle steps own their CTA via onb-actions-stack -->
				<button type="button" class="onb-cta" onclick={next}>
					{m.onb_next()}
					<ArrowRight size={16} strokeWidth={2} />
				</button>
			{:else}
				<span></span>
			{/if}
		</div>
	</div>
{/if}

<style>
	.onb {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		flex-direction: column;
		padding: calc(var(--safe-top, 0px) + 18px) 22px calc(var(--safe-bot, 0px) + 24px);
		background:
			radial-gradient(
				circle at 20% 0%,
				color-mix(in oklab, var(--color-accent) 22%, transparent),
				transparent 55%
			),
			radial-gradient(
				circle at 100% 100%,
				color-mix(in oklab, var(--color-accent) 14%, transparent),
				transparent 55%
			),
			color-mix(in oklab, var(--color-bg-0) 96%, var(--color-accent));
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		max-width: var(--app-max-w);
		margin-inline: auto;
		animation: onb-fade 220ms ease-out;
	}
	@keyframes onb-fade {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	.onb-close {
		position: absolute;
		top: calc(var(--safe-top, 0px) + 14px);
		right: 18px;
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--color-bg-0) 60%, transparent);
		border: 1px solid var(--color-border-subtle);
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.onb-close:active {
		opacity: 0.85;
	}

	.onb-progress {
		display: flex;
		gap: 6px;
		justify-content: center;
		margin-top: 6px;
	}
	.onb-pip {
		width: 22px;
		height: 4px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--color-text-faint) 40%, transparent);
		transition: all 220ms ease;
	}
	.onb-pip.done {
		background: color-mix(in oklab, var(--color-accent) 60%, transparent);
	}
	.onb-pip.active {
		background: var(--color-accent);
		width: 36px;
	}

	.onb-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: stretch;
		padding: 16px 4px;
		gap: 14px;
	}
	.onb-illust {
		width: 84px;
		height: 84px;
		border-radius: 24px;
		display: grid;
		place-items: center;
		margin-bottom: 8px;
		background: color-mix(in oklab, var(--color-accent) 14%, var(--color-surface-1));
		color: var(--color-accent);
		box-shadow:
			0 1px 0 color-mix(in oklab, var(--color-accent) 24%, transparent) inset,
			0 12px 28px -16px color-mix(in oklab, var(--color-accent) 60%, transparent);
	}
	.onb-title {
		font-size: 24px;
		font-weight: 600;
		letter-spacing: -0.025em;
		line-height: 1.15;
		margin: 0;
	}
	.onb-desc {
		font-size: 14.5px;
		line-height: 1.5;
		color: var(--color-text-muted);
		margin: 0;
	}
	.onb-actions-stack {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 4px;
	}

	.onb-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-top: 6px;
	}

	.onb-cta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 46px;
		padding: 0 20px;
		font: inherit;
		font-size: 14.5px;
		font-weight: 600;
		border-radius: 999px;
		background: var(--color-accent);
		color: #fff;
		border: none;
		cursor: pointer;
		text-decoration: none;
	}
	.onb-cta:active {
		opacity: 0.9;
	}
	.onb-cta-done {
		width: 100%;
	}

	.onb-back {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font: inherit;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-muted);
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 8px 4px;
	}

	.onb-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 38px;
		font: inherit;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-muted);
		background: transparent;
		border: none;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 4px;
	}
</style>
