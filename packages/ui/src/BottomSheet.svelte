<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		subtitle,
		children
	}: {
		open: boolean;
		title: string;
		subtitle?: string;
		children: Snippet;
	} = $props();

	let sheetEl = $state<HTMLDivElement | null>(null);
	let dragY = $state(0);
	let isDragging = $state(false);
	let startY = 0;
	let startTime = 0;

	let mounted = $state(false);
	let closing = $state(false);

	$effect(() => {
		if (open) {
			mounted = true;
			closing = false;
		} else if (mounted && !closing) {
			closing = true;
			const height = sheetEl?.offsetHeight ?? 300;
			dragY = height;
			setTimeout(() => {
				mounted = false;
				closing = false;
				dragY = 0;
			}, 320);
		}
	});

	function close() {
		open = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	function onPointerDown(e: PointerEvent) {
		const target = e.target as HTMLElement;
		if (target.closest('button, input, select, textarea, a')) return;
		isDragging = true;
		startY = e.clientY;
		startTime = Date.now();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: PointerEvent) {
		if (!isDragging) return;
		dragY = Math.max(0, e.clientY - startY);
	}

	function onPointerUp() {
		if (!isDragging) return;
		isDragging = false;
		const elapsed = Date.now() - startTime;
		const velocity = elapsed > 0 ? (dragY / elapsed) * 1000 : 0;
		const threshold = (sheetEl?.offsetHeight ?? 300) * 0.3;
		if (dragY > threshold || velocity > 400) {
			close();
		} else {
			dragY = 0;
		}
	}

	const backdropOpacity = $derived(sheetEl ? 1 - (dragY / (sheetEl.offsetHeight * 0.6)) * 0.6 : 1);
</script>

<svelte:window onkeydown={onKeydown} />

{#if mounted}
	<div class="sheet-backdrop" role="dialog" aria-modal="true" aria-label={title}>
		<button
			type="button"
			class="sheet-scrim"
			style="opacity: {backdropOpacity}"
			onclick={close}
			aria-label="Close"
			tabindex="-1"
		></button>

		<div
			bind:this={sheetEl}
			role="presentation"
			class="sheet-panel"
			style="transform: translateY({dragY}px); transition: {isDragging
				? 'none'
				: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)'};"
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
		>
			<div class="sheet-grab"></div>

			<div class="sheet-header">
				<div>
					<h2 class="sheet-title">{title}</h2>
					{#if subtitle}
						<p class="sheet-subtitle">{subtitle}</p>
					{/if}
				</div>
				<button type="button" onclick={close} class="sheet-close" aria-label="Close">
					<svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
						<path
							d="M1 1l10 10M11 1L1 11"
							stroke="currentColor"
							stroke-width="1.75"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			</div>

			<div class="sheet-content">
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style>
	.sheet-backdrop {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		background: transparent;
		animation: fade-in var(--dur-fast, 150ms) ease;
	}

	.sheet-scrim {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(2px);
		-webkit-backdrop-filter: blur(2px);
		border: none;
		padding: 0;
		cursor: default;
	}

	.sheet-panel {
		position: relative;
		background: var(--color-surface-1, #fff);
		border-radius: 22px 22px 0 0;
		box-shadow: 0 -20px 40px -20px rgba(0, 0, 0, 0.14);
		animation: slide-up var(--dur-base, 240ms) cubic-bezier(0.32, 0.72, 0, 1);
		touch-action: none;
		user-select: none;
	}

	.sheet-grab {
		width: 36px;
		height: 4px;
		border-radius: 999px;
		background: var(--color-border-default, rgba(10, 10, 10, 0.1));
		margin: 8px auto 14px;
	}

	.sheet-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		padding: 0 20px 16px;
	}

	.sheet-title {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--color-text-primary, #18181b);
	}

	.sheet-subtitle {
		margin: 4px 0 0;
		font-size: 13px;
		color: var(--color-text-subtle, #71717a);
	}

	.sheet-close {
		width: 28px;
		height: 28px;
		border-radius: 999px;
		background: var(--color-bg-1, #f4f4f2);
		color: var(--color-text-subtle, #71717a);
		border: none;
		display: grid;
		place-items: center;
		flex-shrink: 0;
		cursor: pointer;
		transition: background 150ms;
	}

	.sheet-close:active {
		background: var(--color-bg-2, #ececea);
	}

	.sheet-content {
		overflow-y: auto;
		padding: 0 20px calc(32px + env(safe-area-inset-bottom, 0px));
		max-height: 85dvh;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
</style>
