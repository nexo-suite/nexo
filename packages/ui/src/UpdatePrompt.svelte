<script lang="ts">
	import { onMount } from 'svelte';

	let {
		title = 'Update ready',
		subtitle = 'Reload to get the latest version.',
		reloadLabel = 'Reload',
		dismissLabel = 'Later',
		version,
		bottomOffset = 16,
		onbeforereload
	}: {
		title?: string;
		subtitle?: string;
		reloadLabel?: string;
		dismissLabel?: string;
		version?: string;
		/** Pixels (number) or CSS length (string) above the safe-area inset. Apps with bottom navs should pass tab height + gap. */
		bottomOffset?: number | string;
		onbeforereload?: () => void;
	} = $props();

	const offsetValue = $derived(
		typeof bottomOffset === 'number' ? `${bottomOffset}px` : bottomOffset
	);

	let show = $state(false);

	onMount(() => {
		if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
		const handler = () => {
			show = true;
		};
		navigator.serviceWorker.addEventListener('controllerchange', handler);
		return () => navigator.serviceWorker.removeEventListener('controllerchange', handler);
	});

	function reload() {
		onbeforereload?.();
		window.location.reload();
	}
</script>

{#if show}
	<div class="update-prompt" role="status" aria-live="polite" style="--up-offset: {offsetValue};">
		<span class="up-icon" aria-hidden="true">
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
			>
				<path d="M3 12a9 9 0 0 1 15.36-6.36L21 8" />
				<path d="M21 3v5h-5" />
				<path d="M21 12a9 9 0 0 1-15.36 6.36L3 16" />
				<path d="M3 21v-5h5" />
			</svg>
			<span class="up-pulse" aria-hidden="true"></span>
		</span>
		<div class="up-text">
			<div class="up-title">
				{title}
				{#if version}
					<span class="up-chip">{version}</span>
				{/if}
			</div>
			<div class="up-subtitle">{subtitle}</div>
		</div>
		<div class="up-actions">
			<button type="button" class="up-dismiss" onclick={() => (show = false)}>
				{dismissLabel}
			</button>
			<button type="button" class="up-reload" onclick={reload}>
				{reloadLabel}
			</button>
		</div>
	</div>
{/if}

<style>
	.update-prompt {
		position: fixed;
		left: 50%;
		bottom: calc(var(--up-offset, 16px) + env(safe-area-inset-bottom, 0px));
		transform: translateX(-50%);
		z-index: 200;
		display: grid;
		grid-template-columns: auto 1fr auto;
		grid-template-rows: auto auto;
		grid-template-areas:
			'icon text actions'
			'icon text actions';
		align-items: center;
		gap: 12px;
		width: min(calc(100vw - 24px), 380px);
		padding: 12px 14px;
		border-radius: 16px;
		background: color-mix(in oklab, var(--color-accent) 4%, var(--color-surface-1, #fff));
		box-shadow:
			0 0 0 1px color-mix(in oklab, var(--color-accent) 22%, transparent),
			0 12px 32px -8px rgb(0 0 0 / 0.18),
			0 2px 6px rgb(0 0 0 / 0.06);
		animation: up-in 280ms cubic-bezier(0.32, 0.72, 0, 1);
		font-family: var(--font-sans, system-ui);
	}

	.up-icon {
		grid-area: icon;
		position: relative;
		width: 36px;
		height: 36px;
		border-radius: 12px;
		display: grid;
		place-items: center;
		background: color-mix(in oklab, var(--color-accent) 14%, transparent);
		color: var(--color-accent);
	}
	.up-icon svg {
		width: 18px;
		height: 18px;
		animation: up-spin 6s linear infinite;
		transform-origin: center;
	}
	.up-pulse {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 7px;
		height: 7px;
		border-radius: 999px;
		background: var(--color-accent);
		box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-accent) 70%, transparent);
		animation: up-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
	}

	.up-text {
		grid-area: text;
		min-width: 0;
		line-height: 1.3;
	}
	.up-title {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-primary, #111);
		letter-spacing: -0.005em;
	}
	.up-chip {
		display: inline-block;
		padding: 1px 6px;
		border-radius: 999px;
		font-family: var(--font-mono, ui-monospace);
		font-size: 10px;
		letter-spacing: 0.04em;
		color: var(--color-accent);
		background: color-mix(in oklab, var(--color-accent) 10%, transparent);
		border: 1px solid color-mix(in oklab, var(--color-accent) 25%, transparent);
	}
	.up-subtitle {
		margin-top: 2px;
		font-size: 12.5px;
		color: var(--color-text-subtle, #666);
	}

	.up-actions {
		grid-area: actions;
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
	}
	.up-dismiss {
		font: inherit;
		font-size: 12.5px;
		font-weight: 500;
		padding: 7px 10px;
		border-radius: 10px;
		border: 0;
		background: transparent;
		color: var(--color-text-muted, #555);
		cursor: pointer;
	}
	.up-dismiss:active {
		background: var(--color-bg-1, #f0f0f0);
	}
	.up-reload {
		font: inherit;
		font-size: 12.5px;
		font-weight: 600;
		padding: 7px 14px;
		border-radius: 10px;
		border: 0;
		background: var(--color-accent);
		color: #fff;
		cursor: pointer;
		box-shadow: 0 4px 10px -2px color-mix(in oklab, var(--color-accent) 50%, transparent);
		transition:
			transform 120ms,
			box-shadow 120ms;
	}
	.up-reload:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 14px -2px color-mix(in oklab, var(--color-accent) 55%, transparent);
	}
	.up-reload:active {
		transform: translateY(0);
	}

	@keyframes up-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(14px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0) scale(1);
		}
	}
	@keyframes up-spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes up-ping {
		0% {
			box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-accent) 70%, transparent);
		}
		70% {
			box-shadow: 0 0 0 8px color-mix(in oklab, var(--color-accent) 0%, transparent);
		}
		100% {
			box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-accent) 0%, transparent);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.update-prompt,
		.up-icon svg,
		.up-pulse,
		.up-reload {
			animation: none;
			transition: none;
		}
	}
</style>
