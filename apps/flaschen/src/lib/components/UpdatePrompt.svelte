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
</script>

{#if show}
	<div class="update-toast" role="alert">
		<span>New version available</span>
		<button type="button" class="reload-btn" onclick={reload}>Reload</button>
		<button type="button" class="dismiss" onclick={() => (show = false)} aria-label="Dismiss">
			&times;
		</button>
	</div>
{/if}

<style>
	.update-toast {
		position: fixed;
		bottom: calc(var(--tab-h) + var(--safe-bot) + 12px);
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border-radius: 12px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		box-shadow: 0 8px 24px rgb(0 0 0 / 0.15);
		font-size: 13px;
	}
	.reload-btn {
		font-size: 12px;
		font-weight: 600;
		padding: 6px 12px;
		border-radius: 999px;
		border: 0;
		background: var(--color-accent);
		color: #fff;
		cursor: pointer;
	}
	.dismiss {
		font-size: 16px;
		line-height: 1;
		background: none;
		border: 0;
		color: var(--color-text-muted);
		cursor: pointer;
		padding: 2px 6px;
	}
</style>
