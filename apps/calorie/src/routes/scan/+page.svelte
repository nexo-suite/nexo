<script lang="ts">
	import { ChevronLeft, RefreshCw, Pencil, Send } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import ScannerReticle from '$lib/components/ScannerReticle.svelte';
	import { makeDecoder } from '$lib/scanner/decode';
	import { m } from '$lib/paraglide/messages.js';

	let phase = $state<'idle' | 'searching' | 'found' | 'not-found'>('idle');
	let torchOn = $state(false);
	let manual = $state('');
	let videoEl = $state<HTMLVideoElement | null>(null);
	let stream: MediaStream | null = null;
	let stop = $state(false);
	let cameraError = $state<string | null>(null);
	let needsTap = $state(false);
	// The barcode we last attempted — kept so the not-found card can show it
	// (it makes the error feel concrete, and gives the user something to copy
	// or paste into Open Food Facts directly).
	let lastBarcode = $state<string | null>(null);

	// Friends-and-family humor: a tiny rotating bench of headlines so the same
	// dead-end doesn't feel like a wall every time. Picked once per not-found.
	const NOT_FOUND_LINES: Array<() => string> = [
		m.scan_nf_line_1,
		m.scan_nf_line_2,
		m.scan_nf_line_3,
		m.scan_nf_line_4,
		m.scan_nf_line_5
	];
	let notFoundLine = $state<() => string>(NOT_FOUND_LINES[0]);

	async function lookup(barcode: string) {
		phase = 'searching';
		lastBarcode = barcode;
		try {
			const res = await fetch(`/api/foods/scan?barcode=${encodeURIComponent(barcode)}`);
			if (res.status === 404) {
				notFoundLine = NOT_FOUND_LINES[Math.floor(Math.random() * NOT_FOUND_LINES.length)];
				phase = 'not-found';
				return;
			}
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			phase = 'found';
			// Hand the result to the caller via session storage so the home page can pick it up
			const data = await res.json();
			sessionStorage.setItem('calorie:lastScan', JSON.stringify(data));
			goto('/?from=scan');
		} catch (e) {
			console.error('scan lookup failed', e);
			notFoundLine = NOT_FOUND_LINES[Math.floor(Math.random() * NOT_FOUND_LINES.length)];
			phase = 'not-found';
		}
	}

	async function startCamera() {
		if (!videoEl) {
			cameraError = 'Video element not ready';
			return;
		}
		cameraError = null;
		needsTap = false;
		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: { ideal: 'environment' } }
			});
			videoEl.srcObject = stream;

			// Wait for metadata so the video has real dimensions before play().
			// On iOS PWA standalone, calling play() before loadedmetadata is a
			// common cause of permission-granted-but-black-screen.
			if (videoEl.readyState < 1) {
				await new Promise<void>((resolve, reject) => {
					if (!videoEl) return reject(new Error('video unmounted'));
					const onLoad = () => {
						cleanup();
						resolve();
					};
					const onErr = () => {
						cleanup();
						reject(new Error('loadedmetadata error'));
					};
					const cleanup = () => {
						videoEl?.removeEventListener('loadedmetadata', onLoad);
						videoEl?.removeEventListener('error', onErr);
					};
					videoEl.addEventListener('loadedmetadata', onLoad, { once: true });
					videoEl.addEventListener('error', onErr, { once: true });
				});
			}

			try {
				await videoEl.play();
			} catch (playErr) {
				// iOS PWA can refuse autoplay even with playsinline+muted if the
				// page wasn't entered via direct user gesture. Surface a tap-to-start.
				console.warn('autoplay blocked, requesting tap', playErr);
				needsTap = true;
				return;
			}

			startDecodeLoop();
		} catch (e) {
			console.error('camera failed', e);
			cameraError = e instanceof Error ? e.message : String(e);
		}
	}

	async function startDecodeLoop() {
		let decode;
		try {
			decode = await makeDecoder();
		} catch (e) {
			console.error('scanner init failed', e);
			cameraError = e instanceof Error ? e.message : String(e);
			return;
		}
		const tick = async () => {
			if (stop || !videoEl) return;
			if (phase === 'idle') {
				const hit = await decode(videoEl);
				if (hit && /^\d{8,14}$/.test(hit)) {
					await lookup(hit);
					return;
				}
			}
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	}

	async function tapToStart() {
		if (!videoEl) return;
		try {
			await videoEl.play();
			needsTap = false;
			startDecodeLoop();
		} catch (e) {
			console.error('tap-to-start failed', e);
			cameraError = e instanceof Error ? e.message : String(e);
		}
	}

	function reset() {
		phase = 'idle';
		manual = '';
	}

	function logManually() {
		// Stash the orphaned barcode so the home page can offer "create as your
		// own food" pre-filled with it, instead of dropping the user in cold.
		if (lastBarcode) {
			sessionStorage.setItem('calorie:scanOrphan', lastBarcode);
		}
		goto('/?from=scan-orphan');
	}

	function openOFF() {
		if (!lastBarcode) return;
		// Open Food Facts has a per-product URL — sending users there to add it
		// keeps OFF healthy and means the scan works for everyone next time.
		window.open(`https://world.openfoodfacts.org/product/${lastBarcode}`, '_blank', 'noopener');
	}

	// Visually format a barcode like a typewriter slip: groups of 4.
	const formattedBarcode = $derived.by(() => {
		if (!lastBarcode) return '';
		return lastBarcode.replace(/(.{4})/g, '$1 ').trim();
	});

	onMount(() => {
		startCamera();
	});

	onDestroy(() => {
		stop = true;
		stream?.getTracks().forEach((t) => t.stop());
	});
</script>

<div class="scan-page" data-phase={phase}>
	<button class="back" type="button" onclick={() => goto('/')} aria-label={m.action_back()}>
		<ChevronLeft size={22} strokeWidth={1.7} />
	</button>

	<div class="reticle-wrap" role="region" aria-label="Barcode scanner">
		<video
			bind:this={videoEl}
			class="cam-video"
			class:dim={phase === 'not-found'}
			playsinline
			muted
			aria-hidden="true"
		></video>
		<ScannerReticle state={phase} bind:torchOn />

		{#if needsTap}
			<button class="overlay-cta" type="button" onclick={tapToStart}>
				Tap to start camera
			</button>
		{:else if cameraError}
			<div class="overlay-error" role="alert">
				<p>Camera unavailable</p>
				<p class="overlay-error-detail">{cameraError}</p>
				<button class="overlay-cta" type="button" onclick={startCamera}>Retry</button>
			</div>
		{/if}

		{#if phase === 'not-found'}
			<div class="nf-card" role="alert">
				<div class="nf-stamp" aria-hidden="true">
					<svg viewBox="0 0 80 80" width="64" height="64" fill="none">
						<!-- Postmark-style ring with a soft slash -->
						<circle
							cx="40"
							cy="40"
							r="34"
							stroke="currentColor"
							stroke-width="1.4"
							stroke-dasharray="3 5"
							opacity="0.6"
						/>
						<circle
							cx="40"
							cy="40"
							r="26"
							stroke="currentColor"
							stroke-width="1.2"
							opacity="0.45"
						/>
						<path
							d="M22 22 L58 58"
							stroke="currentColor"
							stroke-width="1.6"
							stroke-linecap="round"
							opacity="0.65"
						/>
						<text
							x="40"
							y="44"
							text-anchor="middle"
							font-family="var(--font-mono)"
							font-size="9"
							letter-spacing="0.18em"
							fill="currentColor"
							opacity="0.9"
						>
							NOT FILED
						</text>
					</svg>
				</div>

				<p class="nf-eyebrow">{m.scan_nf_eyebrow()}</p>
				<h2 class="nf-headline">{notFoundLine()}</h2>

				{#if lastBarcode}
					<div class="nf-barcode" aria-label={`Scanned barcode ${lastBarcode}`}>
						<span class="nf-barcode-label">{m.scan_nf_barcode_label()}</span>
						<span class="nf-barcode-value">{formattedBarcode}</span>
					</div>
				{/if}

				<p class="nf-body">{m.scan_nf_body()}</p>

				<div class="nf-actions">
					<button class="nf-primary" type="button" onclick={logManually}>
						<Pencil size={15} strokeWidth={1.8} />
						<span>{m.scan_nf_add_yourself()}</span>
					</button>
					<button class="nf-secondary" type="button" onclick={reset}>
						<RefreshCw size={14} strokeWidth={1.7} />
						<span>{m.scan_nf_try_again()}</span>
					</button>
				</div>

				{#if lastBarcode}
					<button class="nf-link" type="button" onclick={openOFF}>
						<Send size={11} strokeWidth={1.7} />
						<span>{m.scan_nf_help_off()}</span>
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<div class="bottom-panel" class:hidden={phase === 'not-found'}>
		<div class="panel-rule" aria-hidden="true">
			<span class="rule-line"></span>
			<span class="rule-eyebrow">{m.scan_manual_label()}</span>
			<span class="rule-line"></span>
		</div>

		<form
			class="manual"
			onsubmit={(e) => {
				e.preventDefault();
				if (manual.length >= 8) lookup(manual);
			}}
		>
			<div class="manual-row">
				<input
					id="barcode"
					class="manual-input"
					type="text"
					inputmode="numeric"
					pattern="[0-9]*"
					placeholder={m.scan_manual_placeholder()}
					bind:value={manual}
					aria-label={m.scan_manual_label()}
				/>
				<button
					type="submit"
					class="manual-go"
					disabled={manual.length < 8}
					aria-label="Look up"
				>
					<span class="go-arrow">→</span>
				</button>
			</div>
			<p class="manual-hint">{m.scan_manual_hint()}</p>
		</form>
	</div>
</div>

<style>
	.scan-page {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		/* Warm graphite — a darkroom rather than a void. The radial center
		   keeps the camera feed feeling lit; the corners darken into the
		   scope housing. */
		background:
			radial-gradient(ellipse 90% 70% at 50% 38%, oklch(20% 0.025 50), oklch(13% 0.02 50) 70%),
			oklch(11% 0.018 45);
		position: relative;
		z-index: 1;
		padding-top: var(--safe-top);
	}

	/* Subtle warm noise overlay on the page chrome — adds film texture
	   to the strips above and below the camera feed. */
	.scan-page::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		background-image:
			radial-gradient(circle at 20% 30%, oklch(40% 0.04 50) 0.4px, transparent 1.5px),
			radial-gradient(circle at 75% 65%, oklch(38% 0.04 50) 0.4px, transparent 1.5px);
		background-size: 5px 5px, 7px 7px;
		opacity: 0.18;
		mix-blend-mode: overlay;
		z-index: 0;
	}

	.back {
		all: unset;
		cursor: pointer;
		position: absolute;
		top: calc(var(--safe-top) + 12px);
		left: 12px;
		width: 40px;
		height: 40px;
		border-radius: 999px;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.12);
		display: grid;
		place-items: center;
		color: oklch(95% 0.008 70);
		z-index: 2;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.reticle-wrap {
		flex: 1;
		display: flex;
		min-height: 0;
		position: relative;
	}

	.cam-video {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: 0;
		transition: filter 320ms ease;
	}

	.cam-video.dim {
		filter: blur(14px) brightness(0.42) saturate(0.7);
	}

	.overlay-cta {
		all: unset;
		cursor: pointer;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		padding: 14px 22px;
		background: var(--color-ember);
		color: oklch(98% 0.008 70);
		border-radius: 14px;
		font-size: 15px;
		font-weight: 500;
		z-index: 3;
	}

	.overlay-error {
		position: absolute;
		inset: 20px;
		display: grid;
		place-items: center;
		gap: 10px;
		text-align: center;
		color: oklch(95% 0.008 70);
		z-index: 3;
	}

	.overlay-error-detail {
		font-size: 12px;
		opacity: 0.7;
		font-family: var(--font-mono);
	}

	/* ── Not-found card — paper slip pinned to a corkboard ── */
	.nf-card {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%) rotate(-0.6deg);
		width: min(86vw, 360px);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 28px 22px 22px;
		background: oklch(96% 0.018 70);
		color: oklch(28% 0.04 50);
		border-radius: 6px;
		box-shadow:
			0 0 0 1px oklch(88% 0.02 70),
			0 1px 0 oklch(78% 0.02 70),
			0 30px 40px -16px rgba(0, 0, 0, 0.55),
			0 60px 80px -40px rgba(0, 0, 0, 0.45);
		z-index: 4;
		text-align: center;
		animation: nf-drop 480ms cubic-bezier(0.22, 1, 0.36, 1) both;
		isolation: isolate;
	}

	/* Subtle paper grain */
	.nf-card::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background-image:
			radial-gradient(circle at 22% 30%, oklch(80% 0.02 70) 0.4px, transparent 1.6px),
			radial-gradient(circle at 75% 65%, oklch(80% 0.02 70) 0.4px, transparent 1.6px);
		background-size: 4px 4px, 6px 6px;
		opacity: 0.45;
		mix-blend-mode: multiply;
		pointer-events: none;
		z-index: -1;
	}

	/* Tape strip pinned to the top */
	.nf-card::after {
		content: '';
		position: absolute;
		top: -10px;
		left: 50%;
		transform: translateX(-50%) rotate(-1.5deg);
		width: 64px;
		height: 18px;
		background: oklch(88% 0.04 78 / 0.78);
		border-left: 1px solid oklch(78% 0.04 78 / 0.55);
		border-right: 1px solid oklch(78% 0.04 78 / 0.55);
		box-shadow: 0 1px 0 oklch(70% 0.04 78 / 0.4);
	}

	@keyframes nf-drop {
		0% {
			opacity: 0;
			transform: translate(-50%, calc(-50% - 24px)) rotate(-3deg) scale(0.96);
		}
		60% {
			transform: translate(-50%, calc(-50% + 4px)) rotate(0deg) scale(1.005);
		}
		100% {
			opacity: 1;
			transform: translate(-50%, -50%) rotate(-0.6deg) scale(1);
		}
	}

	.nf-stamp {
		color: var(--color-ember-deep);
		opacity: 0.85;
		margin-bottom: 2px;
		animation: nf-stamp 600ms cubic-bezier(0.32, 0.72, 0, 1) 200ms both;
	}

	@keyframes nf-stamp {
		from {
			opacity: 0;
			transform: scale(1.4) rotate(-12deg);
		}
		to {
			opacity: 0.85;
			transform: scale(1) rotate(-6deg);
		}
	}

	.nf-eyebrow {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: var(--color-ember-deep);
		opacity: 0.75;
		margin: 4px 0 0;
	}

	.nf-headline {
		font-family: var(--font-display);
		font-variation-settings:
			'opsz' 60,
			'SOFT' 100,
			'wght' 460;
		font-size: clamp(20px, 5.6vw, 24px);
		line-height: 1.18;
		letter-spacing: -0.02em;
		color: oklch(24% 0.04 50);
		margin: 0;
		max-width: 280px;
	}

	.nf-barcode {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		margin: 8px 0 4px;
		padding: 8px 14px;
		background: oklch(94% 0.014 70);
		border: 1px dashed oklch(78% 0.02 70);
		border-radius: 4px;
	}

	.nf-barcode-label {
		font-family: var(--font-mono);
		font-size: 8.5px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: oklch(54% 0.02 70);
	}

	.nf-barcode-value {
		font-family: var(--font-mono);
		font-feature-settings: 'tnum' 1;
		font-size: 14.5px;
		letter-spacing: 0.06em;
		color: oklch(28% 0.04 50);
	}

	.nf-body {
		font-family: var(--font-display);
		font-style: italic;
		font-variation-settings:
			'opsz' 24,
			'SOFT' 100,
			'wght' 380,
			'ital' 1;
		font-size: 13px;
		line-height: 1.45;
		color: oklch(46% 0.03 50);
		margin: 0;
		max-width: 260px;
	}

	.nf-actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		margin-top: 10px;
	}

	.nf-primary {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 13px 18px;
		background: var(--color-ember);
		color: oklch(98% 0.008 70);
		border-radius: 999px;
		font-size: 14px;
		font-weight: 500;
		letter-spacing: 0.005em;
		box-shadow: 0 6px 14px -6px var(--color-ember-deep);
		transition:
			transform 120ms,
			background 200ms;
	}

	.nf-primary:active {
		transform: scale(0.97);
		background: var(--color-ember-deep);
	}

	.nf-secondary {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		padding: 11px 18px;
		background: transparent;
		color: oklch(36% 0.03 50);
		border: 1px solid oklch(82% 0.02 70);
		border-radius: 999px;
		font-size: 13px;
		font-weight: 500;
		transition:
			background 200ms,
			border-color 200ms;
	}

	.nf-secondary:active {
		background: oklch(92% 0.02 70);
		border-color: oklch(72% 0.02 70);
	}

	.nf-link {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin-top: 4px;
		padding: 6px 4px;
		font-size: 11.5px;
		color: oklch(50% 0.04 50);
		text-decoration: underline;
		text-decoration-style: dotted;
		text-decoration-color: oklch(72% 0.02 70);
		text-underline-offset: 3px;
	}

	.nf-link:active {
		color: var(--color-ember-deep);
	}

	.bottom-panel {
		position: relative;
		padding: 22px 24px calc(28px + var(--safe-bot));
		/* Warm gradient with a hint of ember bleeding up. Replaces the flat
		   black-to-transparent that didn't really feel like part of the
		   instrument. */
		background:
			linear-gradient(
				to top,
				oklch(11% 0.02 45) 0%,
				oklch(13% 0.02 45) 30%,
				oklch(13% 0.02 45 / 0.7) 75%,
				transparent 100%
			),
			radial-gradient(
				ellipse 60% 80% at 50% 100%,
				color-mix(in oklab, var(--color-ember) 12%, transparent),
				transparent 70%
			);
		display: flex;
		flex-direction: column;
		gap: 12px;
		transition:
			opacity 240ms,
			transform 280ms;
		z-index: 2;
	}

	/* A hairline measurement rule pinned to the top of the panel — visually
	   ties the panel back into the scope housing. */
	.bottom-panel::before {
		content: '';
		position: absolute;
		top: 0;
		left: 14%;
		right: 14%;
		height: 1px;
		background: linear-gradient(
			to right,
			transparent,
			color-mix(in oklab, var(--color-ember-glow) 50%, transparent) 50%,
			transparent
		);
		opacity: 0.5;
	}

	.bottom-panel.hidden {
		opacity: 0;
		transform: translateY(8px);
		pointer-events: none;
	}

	/* ── Eyebrow rule with mono label between two dashed lines ── */
	.panel-rule {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 0 4px;
	}

	.rule-line {
		flex: 1;
		height: 1px;
		background-image: linear-gradient(
			to right,
			color-mix(in oklab, var(--color-ember-glow) 30%, transparent) 50%,
			transparent 50%
		);
		background-size: 4px 1px;
		opacity: 0.65;
	}

	.rule-eyebrow {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.26em;
		text-transform: uppercase;
		color: color-mix(in oklab, var(--color-ember-glow) 65%, oklch(72% 0.014 70));
	}

	.manual {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.manual-row {
		display: flex;
		gap: 10px;
		align-items: stretch;
	}

	/* Typewriter slip: monospace, dashed underline, no box. The input
	   feels like a typed line on a service ticket — fits the instrument
	   theme without competing with the camera feed. */
	.manual-input {
		flex: 1;
		all: unset;
		padding: 12px 4px 12px 4px;
		color: oklch(95% 0.012 60);
		font-family: var(--font-mono);
		font-size: 17px;
		font-feature-settings: 'tnum' 1;
		letter-spacing: 0.08em;
		border-bottom: 1px dashed color-mix(in oklab, var(--color-ember-glow) 38%, transparent);
		caret-color: var(--color-ember-glow);
		transition: border-color 200ms;
	}

	.manual-input:focus {
		border-bottom-color: var(--color-ember-glow);
		border-bottom-style: solid;
	}

	.manual-input::placeholder {
		color: color-mix(in oklab, var(--color-ember-glow) 18%, oklch(56% 0.014 70));
		font-style: italic;
		letter-spacing: 0.06em;
	}

	.manual-go {
		all: unset;
		cursor: pointer;
		padding: 0 16px;
		min-width: 50px;
		min-height: 44px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		background: color-mix(in oklab, var(--color-ember) 92%, transparent);
		color: oklch(98% 0.008 70);
		font-family: var(--font-display);
		font-size: 18px;
		box-shadow:
			0 4px 14px -4px color-mix(in oklab, var(--color-ember) 70%, transparent),
			inset 0 0 0 1px color-mix(in oklab, var(--color-ember-glow) 28%, transparent);
		transition:
			opacity 180ms,
			transform 140ms,
			background 200ms;
	}

	.manual-go:active {
		transform: scale(0.95);
		background: var(--color-ember-deep);
	}

	.manual-go:disabled {
		opacity: 0.32;
		cursor: default;
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.04);
	}

	.go-arrow {
		display: inline-block;
		transform: translateY(-1px);
	}

	.manual-hint {
		margin: 4px 4px 0;
		font-family: var(--font-display);
		font-style: italic;
		font-variation-settings: 'opsz' 14, 'SOFT' 100, 'wght' 380, 'ital' 1;
		font-size: 12px;
		line-height: 1.4;
		color: color-mix(in oklab, var(--color-ember-glow) 22%, oklch(62% 0.012 60));
		opacity: 0.85;
	}

	@media (prefers-reduced-motion: reduce) {
		.nf-card,
		.nf-stamp {
			animation: none;
		}
		.cam-video {
			transition: none;
		}
	}
</style>
