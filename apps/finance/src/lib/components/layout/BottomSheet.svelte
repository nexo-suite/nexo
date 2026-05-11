<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		children
	}: {
		open: boolean;
		title: string;
		children: Snippet;
	} = $props();

	let sheetEl = $state<HTMLDivElement | null>(null);
	let dragY = $state(0);
	let isDragging = $state(false);
	let startY = 0;
	let startTime = 0;

	function close() {
		dragY = sheetEl?.offsetHeight ?? 300;
		setTimeout(() => {
			open = false;
			dragY = 0;
		}, 320);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	function onPointerDown(e: PointerEvent) {
		// Only drag from the handle area or header, not from interactive elements
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

{#if open}
	<div
		class="sheet-backdrop fixed inset-0 z-50 flex flex-col justify-end"
		role="dialog"
		aria-modal="true"
		aria-label={title}
	>
		<!-- Backdrop -->
		<button
			type="button"
			class="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
			style="opacity: {backdropOpacity}"
			onclick={close}
			aria-label="Close"
			tabindex="-1"
		></button>

		<!-- Sheet panel -->
		<div
			bind:this={sheetEl}
			role="presentation"
			class="sheet-panel relative rounded-t-3xl bg-surface shadow-2xl"
			style="transform: translateY({dragY}px); transition: {isDragging
				? 'none'
				: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)'};"
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
			onpointercancel={onPointerUp}
		>
			<!-- Drag handle -->
			<div class="flex justify-center pt-3 pb-1">
				<div class="h-1 w-10 rounded-full bg-border"></div>
			</div>

			<!-- Header -->
			<div class="flex items-center justify-between px-5 pt-2 pb-4">
				<h2 class="text-base font-semibold tracking-tight">{title}</h2>
				<button
					type="button"
					onclick={close}
					class="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-neutral transition-colors hover:bg-border"
					aria-label="Close"
				>
					<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
						<path
							d="M1 1l10 10M11 1L1 11"
							stroke="currentColor"
							stroke-width="1.75"
							stroke-linecap="round"
						/>
					</svg>
				</button>
			</div>

			<!-- Content — clears the bottom nav bar + safe area -->
			<div
				class="px-5"
				style="padding-bottom: max(calc(var(--bottom-nav-height) + 1rem), env(safe-area-inset-bottom));"
			>
				{@render children()}
			</div>
		</div>
	</div>
{/if}

<style>
	.sheet-backdrop {
		animation: fade-in 180ms ease;
	}

	.sheet-panel {
		animation: slide-up 280ms cubic-bezier(0.32, 0.72, 0, 1);
		touch-action: none;
		user-select: none;
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
