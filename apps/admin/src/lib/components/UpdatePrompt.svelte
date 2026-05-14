<script lang="ts">
	import { onMount } from 'svelte';

	let show = $state(false);

	onMount(() => {
		if (!('serviceWorker' in navigator)) return;

		navigator.serviceWorker.addEventListener('controllerchange', () => {
			show = true;
		});
	});

	function reload() {
		window.location.reload();
	}

	function dismiss() {
		show = false;
	}
</script>

{#if show}
	<div class="update-toast" role="alert">
		<span>New version available</span>
		<button type="button" class="update-btn" onclick={reload}>Reload</button>
		<button type="button" class="update-dismiss" onclick={dismiss} aria-label="Dismiss">
			&times;
		</button>
	</div>
{/if}

<style>
	.update-toast {
		position: fixed;
		bottom: calc(68px + env(safe-area-inset-bottom, 0px));
		left: 50%;
		transform: translateX(-50%);
		z-index: 200;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border-radius: 12px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		box-shadow: 0 8px 24px rgb(0 0 0 / 0.3);
		font-size: 13px;
		color: var(--color-text-primary);
		animation: slide-up 0.3s ease-out;
	}

	@keyframes slide-up {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	.update-btn {
		font-size: 12px;
		font-weight: 600;
		padding: 5px 12px;
		border-radius: 999px;
		border: 0;
		background: var(--color-accent);
		color: #fff;
		cursor: pointer;
	}

	.update-dismiss {
		font-size: 16px;
		line-height: 1;
		background: none;
		border: 0;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 2px 4px;
	}
</style>
