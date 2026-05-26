<script lang="ts">
	import { Flashlight, FlashlightOff, X } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	let {
		state = 'idle',
		torchOn = $bindable(false)
	}: {
		state?: 'idle' | 'searching' | 'found' | 'not-found';
		torchOn?: boolean;
	} = $props();

	const stateLabel = $derived.by(() => {
		switch (state) {
			case 'searching':
				return m.scan_searching();
			case 'found':
				return m.scan_found();
			case 'not-found':
				return m.scan_not_found();
			default:
				return m.scan_align();
		}
	});
</script>

<div class="reticle" data-state={state}>
	<!-- Atmospheric grain (CSS noise — looks like film stock) -->
	<div class="grain" aria-hidden="true"></div>

	<!-- Top label — adapts to scan state -->
	<div class="top-label" aria-live="polite">
		{#if state === 'searching'}
			<span class="searching">
				<span class="dot d1"></span>
				<span class="dot d2"></span>
				<span class="dot d3"></span>
				<span class="text">{stateLabel}</span>
			</span>
		{:else if state === 'not-found'}
			<span class="notfound">
				<X size={11} strokeWidth={2.2} />
				<span class="text">{stateLabel}</span>
			</span>
		{:else}
			<span class="text">{stateLabel}</span>
		{/if}
	</div>

	<!-- Glassy torch toggle — top-right -->
	<button
		class="torch"
		type="button"
		class:on={torchOn}
		onclick={() => (torchOn = !torchOn)}
		aria-label={m.action_torch()}
		aria-pressed={torchOn}
	>
		{#if torchOn}
			<Flashlight size={15} strokeWidth={1.6} />
		{:else}
			<FlashlightOff size={15} strokeWidth={1.6} />
		{/if}
	</button>

	<!-- Frame — corner brackets only -->
	<div class="frame" aria-hidden="true">
		<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="brackets">
			<!-- TL -->
			<path d="M 0 12 L 0 0 L 12 0" />
			<!-- TR -->
			<path d="M 88 0 L 100 0 L 100 12" />
			<!-- BR -->
			<path d="M 100 88 L 100 100 L 88 100" />
			<!-- BL -->
			<path d="M 12 100 L 0 100 L 0 88" />
		</svg>

		<!-- Animated scan line — drifts up & down inside the frame -->
		<div class="scan-line"></div>
	</div>
</div>

<style>
	.reticle {
		position: relative;
		flex: 1;
		display: grid;
		place-items: center;
		overflow: hidden;
		background: oklch(15% 0.02 60);
	}

	/* Subtle film grain — sits over the camera feed, gives texture */
	.grain {
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.12;
		mix-blend-mode: overlay;
		background-image:
			radial-gradient(circle at 30% 30%, oklch(95% 0.04 60) 0.5px, transparent 1.5px),
			radial-gradient(circle at 70% 60%, oklch(95% 0.04 60) 0.5px, transparent 1.5px);
		background-size: 3px 3px, 5px 5px;
		z-index: 1;
	}

	/* Top label — small mono pill, glassy backdrop */
	.top-label {
		position: absolute;
		top: calc(var(--safe-top) + 64px);
		left: 50%;
		transform: translateX(-50%);
		padding: 7px 14px;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		font-family: var(--font-mono);
		font-size: 10.5px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: oklch(95% 0.008 70);
		z-index: 3;
		border: 1px solid rgba(255, 255, 255, 0.08);
		display: flex;
		align-items: center;
	}

	.searching,
	.notfound {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.searching .dot {
		width: 4px;
		height: 4px;
		border-radius: 999px;
		background: var(--color-ember-glow);
		animation: dot-pulse 1.2s ease-in-out infinite;
	}
	.searching .d2 { animation-delay: 0.15s; }
	.searching .d3 { animation-delay: 0.3s; }

	@keyframes dot-pulse {
		0%, 100% { opacity: 0.3; transform: scale(0.8); }
		50% { opacity: 1; transform: scale(1.1); }
	}

	.notfound {
		color: var(--color-overtarget);
	}

	/* Glassy torch toggle */
	.torch {
		all: unset;
		cursor: pointer;
		position: absolute;
		top: calc(var(--safe-top) + 14px);
		right: 14px;
		width: 40px;
		height: 40px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		color: oklch(95% 0.008 70);
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		transition: background 200ms;
		z-index: 3;
	}

	.torch.on {
		background: color-mix(in oklab, var(--color-ember-glow) 28%, rgba(0, 0, 0, 0.4));
		color: var(--color-ember-glow);
		border-color: color-mix(in oklab, var(--color-ember-glow) 40%, transparent);
	}

	/* Reticle frame — sized to the camera viewport */
	.frame {
		position: relative;
		width: min(80vw, 320px);
		aspect-ratio: 1.4;
		z-index: 2;
	}

	.brackets {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		fill: none;
		stroke: var(--color-ember-glow);
		stroke-width: 2;
		filter: drop-shadow(0 0 6px color-mix(in oklab, var(--color-ember-glow) 40%, transparent));
	}

	/* Scan line drifts up and down — speeds up while searching */
	.scan-line {
		position: absolute;
		left: 6%;
		right: 6%;
		top: 0;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in oklab, var(--color-ember-glow) 70%, transparent) 50%,
			transparent
		);
		box-shadow: 0 0 8px color-mix(in oklab, var(--color-ember-glow) 60%, transparent);
		animation: scan 1.6s cubic-bezier(0.45, 0.1, 0.55, 0.9) infinite;
	}

	.reticle[data-state='searching'] .scan-line {
		animation-duration: 0.9s;
	}

	.reticle[data-state='not-found'] .scan-line {
		display: none;
	}

	@keyframes scan {
		0%, 100% { top: 0; opacity: 1; }
		48% { top: calc(100% - 1px); opacity: 1; }
		50% { top: calc(100% - 1px); opacity: 0; }
		52% { top: 0; opacity: 0; }
		54% { opacity: 1; }
	}

	@media (prefers-reduced-motion: reduce) {
		.scan-line, .searching .dot {
			animation: none;
		}
	}
</style>
