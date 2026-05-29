<script lang="ts">
	import { Flashlight, FlashlightOff, X, Check } from '@lucide/svelte';
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
	<!-- Warm vignette: darkens the edges of the camera feed with an ember
	     tint so the eye is drawn to the center. Subtle but sets the mood. -->
	<div class="vignette" aria-hidden="true"></div>

	<!-- Atmospheric grain — sits over the camera feed, gives texture -->
	<div class="grain" aria-hidden="true"></div>

	<!-- HUD: scope code + status pill + serial number, top center -->
	<div class="hud" aria-hidden="true">
		<span class="hud-tick"></span>
		<span class="hud-code">Ø·LOUPE</span>
		<span class="hud-tick"></span>
	</div>

	<!-- Status pill — adapts to scan state -->
	<div class="top-label" aria-live="polite">
		{#if state === 'searching'}
			<span class="searching">
				<span class="dot d1"></span>
				<span class="dot d2"></span>
				<span class="dot d3"></span>
				<span class="text">{stateLabel}</span>
			</span>
		{:else if state === 'found'}
			<span class="found">
				<Check size={11} strokeWidth={2.4} />
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

	<!-- Frame — instrument viewfinder with corner brackets, hash marks,
	     measurement ticks, and a tiny crosshair at the optical axis. -->
	<div class="frame" aria-hidden="true">
		<svg viewBox="0 0 200 130" preserveAspectRatio="none" class="brackets">
			<!-- Corner brackets: L + inner hash marks (like calibration ticks).
			     Length is ~14% of width so the frame stays open in the middle. -->
			<!-- TL -->
			<g class="corner tl">
				<path d="M 0 22 L 0 0 L 28 0" />
				<path class="hash" d="M 8 6 L 14 6" />
				<path class="hash" d="M 6 8 L 6 14" />
			</g>
			<!-- TR -->
			<g class="corner tr">
				<path d="M 172 0 L 200 0 L 200 22" />
				<path class="hash" d="M 192 6 L 186 6" />
				<path class="hash" d="M 194 8 L 194 14" />
			</g>
			<!-- BR -->
			<g class="corner br">
				<path d="M 200 108 L 200 130 L 172 130" />
				<path class="hash" d="M 192 124 L 186 124" />
				<path class="hash" d="M 194 122 L 194 116" />
			</g>
			<!-- BL -->
			<g class="corner bl">
				<path d="M 28 130 L 0 130 L 0 108" />
				<path class="hash" d="M 8 124 L 14 124" />
				<path class="hash" d="M 6 122 L 6 116" />
			</g>

			<!-- Top measurement scale — tiny ticks across, like a ruler. -->
			<g class="ticks top">
				<line x1="60" y1="0" x2="60" y2="3" />
				<line x1="80" y1="0" x2="80" y2="2" />
				<line x1="100" y1="0" x2="100" y2="5" />
				<line x1="120" y1="0" x2="120" y2="2" />
				<line x1="140" y1="0" x2="140" y2="3" />
			</g>
			<g class="ticks bottom">
				<line x1="60" y1="130" x2="60" y2="127" />
				<line x1="80" y1="130" x2="80" y2="128" />
				<line x1="100" y1="130" x2="100" y2="125" />
				<line x1="120" y1="130" x2="120" y2="128" />
				<line x1="140" y1="130" x2="140" y2="127" />
			</g>

			<!-- Crosshair at optical axis — gap in the middle so the subject
			     stays clean. Plus a tiny center dot. -->
			<g class="crosshair">
				<line x1="100" y1="58" x2="100" y2="63" />
				<line x1="100" y1="67" x2="100" y2="72" />
				<line x1="92" y1="65" x2="97" y2="65" />
				<line x1="103" y1="65" x2="108" y2="65" />
				<circle cx="100" cy="65" r="0.6" class="cross-dot" />
			</g>
		</svg>

		<!-- Quadrant labels — tiny mono codes outside each corner. -->
		<span class="q-label q-tl">ø·01</span>
		<span class="q-label q-tr">ø·02</span>
		<span class="q-label q-br">ø·03</span>
		<span class="q-label q-bl">ø·04</span>

		<!-- Animated scan line — drifts up & down inside the frame -->
		<div class="scan-line"></div>
		<div class="scan-line-glow" aria-hidden="true"></div>

		<!-- Found-state celebration: outward bloom + ring snap -->
		<div class="found-bloom" aria-hidden="true"></div>
		<div class="found-ring" aria-hidden="true"></div>
	</div>

	<!-- Idle voice — italic serif tip below the frame. Quiet, human. -->
	<p class="idle-voice">
		<span class="voice-line">{m.scan_idle_voice()}</span>
	</p>
</div>

<style>
	.reticle {
		position: relative;
		flex: 1;
		display: grid;
		place-items: center;
		overflow: hidden;
		/* No background here — the camera <video> sits absolutely behind us
		   in `.reticle-wrap`. An opaque background occluded the stream and
		   produced a black screen even though the camera track was active.
		   The dark fallback for "video not yet playing" is provided by
		   `.scan-page` in scan/+page.svelte, which shows through. */
	}

	/* ── Vignette: warms and darkens edges, focuses attention center ── */
	.vignette {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 1;
		background:
			radial-gradient(
				ellipse 90% 70% at center,
				transparent 35%,
				color-mix(in oklab, oklch(14% 0.04 40) 35%, transparent) 75%,
				color-mix(in oklab, oklch(10% 0.03 40) 70%, transparent) 100%
			),
			linear-gradient(
				to bottom,
				color-mix(in oklab, oklch(15% 0.04 40) 50%, transparent) 0%,
				transparent 18%,
				transparent 78%,
				color-mix(in oklab, oklch(13% 0.04 40) 60%, transparent) 100%
			);
	}

	/* ── Subtle film grain — sits over the camera feed, gives texture ── */
	.grain {
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0.1;
		mix-blend-mode: overlay;
		background-image:
			radial-gradient(circle at 30% 30%, oklch(95% 0.04 60) 0.5px, transparent 1.5px),
			radial-gradient(circle at 70% 60%, oklch(95% 0.04 60) 0.5px, transparent 1.5px);
		background-size: 3px 3px, 5px 5px;
		z-index: 1;
	}

	/* ── Top HUD: scope serial code with bracketing ticks ── */
	.hud {
		position: absolute;
		top: calc(var(--safe-top) + 24px);
		left: 50%;
		transform: translateX(-50%);
		display: inline-flex;
		align-items: center;
		gap: 7px;
		z-index: 3;
		opacity: 0;
		animation: hud-rise 700ms cubic-bezier(0.32, 0.72, 0, 1) 60ms forwards;
	}

	.hud-tick {
		width: 10px;
		height: 1px;
		background: color-mix(in oklab, var(--color-ember-glow) 60%, transparent);
		box-shadow: 0 0 4px color-mix(in oklab, var(--color-ember-glow) 50%, transparent);
	}

	.hud-code {
		font-family: var(--font-mono);
		font-size: 8.5px;
		letter-spacing: 0.32em;
		color: color-mix(in oklab, var(--color-ember-glow) 78%, oklch(95% 0.008 70));
		text-transform: uppercase;
		opacity: 0.85;
	}

	@keyframes hud-rise {
		from {
			opacity: 0;
			transform: translate(-50%, -4px);
		}
		to {
			opacity: 1;
			transform: translate(-50%, 0);
		}
	}

	/* ── Status pill — small mono pill, glassy backdrop ── */
	.top-label {
		position: absolute;
		top: calc(var(--safe-top) + 56px);
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
		transition:
			background 240ms,
			border-color 240ms,
			color 240ms;
	}

	.searching,
	.notfound,
	.found {
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
	.searching .d2 {
		animation-delay: 0.15s;
	}
	.searching .d3 {
		animation-delay: 0.3s;
	}

	.reticle[data-state='searching'] .top-label {
		background: color-mix(in oklab, var(--color-ember) 18%, rgba(0, 0, 0, 0.5));
		border-color: color-mix(in oklab, var(--color-ember-glow) 30%, transparent);
		color: oklch(96% 0.02 60);
	}

	.reticle[data-state='found'] .top-label {
		background: color-mix(in oklab, var(--color-ontarget) 22%, rgba(0, 0, 0, 0.55));
		border-color: color-mix(in oklab, var(--color-ontarget) 50%, transparent);
		color: oklch(96% 0.04 148);
	}

	.found {
		color: var(--color-ontarget);
	}

	@keyframes dot-pulse {
		0%,
		100% {
			opacity: 0.3;
			transform: scale(0.8);
		}
		50% {
			opacity: 1;
			transform: scale(1.1);
		}
	}

	.notfound {
		color: var(--color-overtarget);
	}

	/* ── Glassy torch toggle ── */
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
		box-shadow:
			inset 0 0 8px color-mix(in oklab, var(--color-ember-glow) 22%, transparent),
			0 0 14px color-mix(in oklab, var(--color-ember-glow) 35%, transparent);
	}

	/* ── Reticle frame — wider, more scope-like proportions ── */
	.frame {
		position: relative;
		width: min(82vw, 340px);
		aspect-ratio: 1.5;
		z-index: 2;
		animation: frame-calibrate 520ms cubic-bezier(0.22, 1, 0.36, 1) 80ms both;
	}

	@keyframes frame-calibrate {
		0% {
			opacity: 0;
			transform: scale(1.06);
		}
		60% {
			opacity: 1;
			transform: scale(0.985);
		}
		100% {
			opacity: 1;
			transform: scale(1);
		}
	}

	.brackets {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		fill: none;
		stroke: var(--color-ember-glow);
		stroke-width: 1.6;
		stroke-linecap: square;
		filter: drop-shadow(0 0 6px color-mix(in oklab, var(--color-ember-glow) 40%, transparent));
		overflow: visible;
	}

	.brackets .corner {
		transition: transform 280ms cubic-bezier(0.32, 0.72, 0, 1);
		transform-box: fill-box;
	}

	.brackets .hash {
		stroke-width: 1;
		opacity: 0.7;
	}

	.brackets .ticks {
		stroke: color-mix(in oklab, var(--color-ember-glow) 75%, transparent);
		stroke-width: 0.7;
		opacity: 0.5;
	}

	.brackets .crosshair {
		stroke: color-mix(in oklab, var(--color-ember-glow) 80%, transparent);
		stroke-width: 0.9;
		stroke-linecap: round;
		opacity: 0.55;
	}

	.brackets .cross-dot {
		fill: var(--color-ember-glow);
		stroke: none;
		opacity: 0.85;
	}

	/* When searching, the brackets pulse subtly + crosshair brightens */
	.reticle[data-state='searching'] .brackets {
		animation: bracket-breathe 1.2s ease-in-out infinite;
	}

	.reticle[data-state='searching'] .crosshair {
		opacity: 0.85;
	}

	@keyframes bracket-breathe {
		0%,
		100% {
			filter: drop-shadow(0 0 6px color-mix(in oklab, var(--color-ember-glow) 40%, transparent));
		}
		50% {
			filter: drop-shadow(
				0 0 14px color-mix(in oklab, var(--color-ember-glow) 80%, transparent)
			);
		}
	}

	/* When found, brackets snap inward briefly, then settle */
	.reticle[data-state='found'] .brackets {
		stroke: var(--color-ontarget);
		filter: drop-shadow(0 0 14px color-mix(in oklab, var(--color-ontarget) 80%, transparent));
		transition:
			stroke 240ms,
			filter 240ms;
	}

	.reticle[data-state='found'] .crosshair,
	.reticle[data-state='found'] .ticks {
		stroke: var(--color-ontarget);
	}

	.reticle[data-state='found'] .corner {
		animation: corner-snap 480ms cubic-bezier(0.22, 1, 0.36, 1) both;
	}

	@keyframes corner-snap {
		0% {
			transform: scale(1);
		}
		35% {
			transform: scale(0.94);
		}
		100% {
			transform: scale(1);
		}
	}

	/* ── Quadrant labels — tiny mono codes at each corner ── */
	.q-label {
		position: absolute;
		font-family: var(--font-mono);
		font-size: 7.5px;
		letter-spacing: 0.18em;
		color: color-mix(in oklab, var(--color-ember-glow) 70%, oklch(80% 0.008 70));
		opacity: 0.7;
		text-transform: uppercase;
		pointer-events: none;
		text-shadow: 0 0 4px color-mix(in oklab, var(--color-ember-glow) 30%, transparent);
	}

	.q-tl {
		top: -16px;
		left: -2px;
	}
	.q-tr {
		top: -16px;
		right: -2px;
	}
	.q-br {
		bottom: -16px;
		right: -2px;
	}
	.q-bl {
		bottom: -16px;
		left: -2px;
	}

	/* ── Scan line: drifts up and down. Now with a softer glow halo. ── */
	.scan-line {
		position: absolute;
		left: 6%;
		right: 6%;
		top: 0;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in oklab, var(--color-ember-glow) 75%, transparent) 50%,
			transparent
		);
		box-shadow: 0 0 8px color-mix(in oklab, var(--color-ember-glow) 65%, transparent);
		animation: scan 1.6s cubic-bezier(0.45, 0.1, 0.55, 0.9) infinite;
	}

	/* A wider, blurrier echo of the scan line — adds depth to the sweep. */
	.scan-line-glow {
		position: absolute;
		left: 14%;
		right: 14%;
		top: 0;
		height: 18px;
		transform: translateY(-9px);
		background: radial-gradient(
			ellipse 80% 50% at center,
			color-mix(in oklab, var(--color-ember-glow) 28%, transparent),
			transparent 70%
		);
		opacity: 0.7;
		animation: scan 1.6s cubic-bezier(0.45, 0.1, 0.55, 0.9) infinite;
		pointer-events: none;
		mix-blend-mode: screen;
	}

	.reticle[data-state='searching'] .scan-line,
	.reticle[data-state='searching'] .scan-line-glow {
		animation-duration: 0.85s;
	}

	.reticle[data-state='not-found'] .scan-line,
	.reticle[data-state='not-found'] .scan-line-glow,
	.reticle[data-state='found'] .scan-line,
	.reticle[data-state='found'] .scan-line-glow {
		display: none;
	}

	/* ── Found-state celebration: outward bloom + expanding ring ── */
	.found-bloom,
	.found-ring {
		position: absolute;
		left: 50%;
		top: 50%;
		pointer-events: none;
		opacity: 0;
	}

	.found-bloom {
		width: 80%;
		height: 80%;
		transform: translate(-50%, -50%);
		background: radial-gradient(
			circle at center,
			color-mix(in oklab, var(--color-ontarget) 35%, transparent),
			transparent 60%
		);
		mix-blend-mode: screen;
	}

	.found-ring {
		width: 30%;
		aspect-ratio: 1;
		transform: translate(-50%, -50%);
		border: 1.5px solid var(--color-ontarget);
		border-radius: 999px;
		box-shadow: 0 0 14px color-mix(in oklab, var(--color-ontarget) 60%, transparent);
	}

	.reticle[data-state='found'] .found-bloom {
		animation: found-bloom 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
	}

	.reticle[data-state='found'] .found-ring {
		animation: found-ring 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
	}

	@keyframes found-bloom {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.6);
		}
		40% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(1.15);
		}
	}

	@keyframes found-ring {
		0% {
			opacity: 0.9;
			transform: translate(-50%, -50%) scale(0.4);
		}
		70% {
			opacity: 0.6;
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(2);
		}
	}

	/* ── Idle voice — italic serif tip below the frame ── */
	.idle-voice {
		position: absolute;
		left: 50%;
		bottom: calc(50% - min(82vw, 340px) / 1.5 / 2 - 38px);
		transform: translateX(-50%);
		margin: 0;
		font-family: var(--font-display);
		font-style: italic;
		font-variation-settings:
			'opsz' 24,
			'SOFT' 100,
			'wght' 400,
			'ital' 1;
		font-size: 13px;
		line-height: 1.4;
		color: color-mix(in oklab, var(--color-ember-glow) 35%, oklch(78% 0.012 60));
		text-align: center;
		max-width: 80vw;
		opacity: 0.85;
		z-index: 3;
		pointer-events: none;
		transition:
			opacity 240ms,
			transform 280ms;
	}

	.voice-line {
		position: relative;
		padding: 0 14px;
	}

	.voice-line::before,
	.voice-line::after {
		content: '';
		position: absolute;
		top: 50%;
		width: 8px;
		height: 1px;
		background: color-mix(in oklab, var(--color-ember-glow) 50%, transparent);
		opacity: 0.7;
	}

	.voice-line::before {
		left: -6px;
	}
	.voice-line::after {
		right: -6px;
	}

	.reticle[data-state='searching'] .idle-voice,
	.reticle[data-state='found'] .idle-voice,
	.reticle[data-state='not-found'] .idle-voice {
		opacity: 0;
		transform: translate(-50%, 4px);
	}

	/* ── When the not-found paper card takes center stage, fade competing UI ── */
	.reticle[data-state='not-found'] .brackets,
	.reticle[data-state='not-found'] .top-label,
	.reticle[data-state='not-found'] .hud,
	.reticle[data-state='not-found'] .q-label {
		opacity: 0;
		transition: opacity 240ms ease;
		pointer-events: none;
	}

	@keyframes scan {
		0%,
		100% {
			top: 0;
			opacity: 1;
		}
		48% {
			top: calc(100% - 1px);
			opacity: 1;
		}
		50% {
			top: calc(100% - 1px);
			opacity: 0;
		}
		52% {
			top: 0;
			opacity: 0;
		}
		54% {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.scan-line,
		.scan-line-glow,
		.searching .dot,
		.frame,
		.hud,
		.reticle[data-state='searching'] .brackets,
		.reticle[data-state='found'] .corner,
		.reticle[data-state='found'] .found-bloom,
		.reticle[data-state='found'] .found-ring {
			animation: none;
		}
	}
</style>
