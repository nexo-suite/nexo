<script lang="ts">
	import { ChevronLeft } from '@lucide/svelte';
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

	async function lookup(barcode: string) {
		phase = 'searching';
		try {
			const res = await fetch(`/api/foods/scan?barcode=${encodeURIComponent(barcode)}`);
			if (res.status === 404) {
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
		const decode = await makeDecoder();
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

	onMount(() => {
		startCamera();
	});

	onDestroy(() => {
		stop = true;
		stream?.getTracks().forEach((t) => t.stop());
	});
</script>

<div class="scan-page">
	<button class="back" type="button" onclick={() => goto('/')} aria-label={m.action_back()}>
		<ChevronLeft size={22} strokeWidth={1.7} />
	</button>

	<div class="reticle-wrap" role="region" aria-label="Barcode scanner">
		<video
			bind:this={videoEl}
			class="cam-video"
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
	</div>

	<div class="bottom-panel">
		{#if phase === 'not-found'}
			<button class="primary-cta" type="button" onclick={() => goto('/')}>
				{m.action_log_manually()}
			</button>
			<button class="secondary-cta" type="button" onclick={reset}> Try again </button>
		{:else}
			<form
				class="manual"
				onsubmit={(e) => {
					e.preventDefault();
					if (manual.length >= 8) lookup(manual);
				}}
			>
				<label class="manual-label" for="barcode">{m.scan_manual_label()}</label>
				<div class="manual-row">
					<input
						id="barcode"
						class="manual-input"
						type="text"
						inputmode="numeric"
						pattern="[0-9]*"
						placeholder={m.scan_manual_placeholder()}
						bind:value={manual}
					/>
					<button type="submit" class="manual-go" disabled={manual.length < 8}>↵</button>
				</div>
			</form>
		{/if}
	</div>
</div>

<style>
	.scan-page {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		background: oklch(15% 0.02 60);
		position: relative;
		z-index: 1;
		padding-top: var(--safe-top);
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

	.bottom-panel {
		padding: 20px 20px calc(24px + var(--safe-bot));
		background: linear-gradient(to top, oklch(12% 0.02 60), transparent);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.manual {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.manual-label {
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: oklch(72% 0.014 70);
	}

	.manual-row {
		display: flex;
		gap: 8px;
		align-items: stretch;
	}

	.manual-input {
		flex: 1;
		all: unset;
		padding: 14px 16px;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 14px;
		color: oklch(95% 0.008 70);
		font-family: var(--font-mono);
		font-size: 15px;
		font-feature-settings: 'tnum' 1;
		letter-spacing: 0.04em;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.manual-input::placeholder {
		color: oklch(60% 0.014 70);
	}

	.manual-go {
		all: unset;
		cursor: pointer;
		padding: 0 18px;
		border-radius: 14px;
		background: var(--color-ember);
		color: oklch(98% 0.008 70);
		font-size: 16px;
		display: grid;
		place-items: center;
		min-width: 52px;
		transition: opacity 160ms;
	}

	.manual-go:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.primary-cta {
		all: unset;
		cursor: pointer;
		padding: 16px 22px;
		text-align: center;
		background: var(--color-ember);
		color: oklch(98% 0.008 70);
		border-radius: 16px;
		font-size: 15px;
		font-weight: 500;
	}

	.secondary-cta {
		all: unset;
		cursor: pointer;
		padding: 12px 22px;
		text-align: center;
		color: oklch(82% 0.014 70);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 14px;
		font-size: 13.5px;
	}
</style>
