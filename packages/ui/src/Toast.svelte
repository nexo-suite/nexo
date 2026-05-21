<script lang="ts">
	let {
		open = $bindable(false),
		type = 'info',
		message,
		detail,
		duration = 5000
	}: {
		open: boolean;
		type?: 'error' | 'success' | 'info';
		message: string;
		detail?: string;
		duration?: number;
	} = $props();

	let copied = $state(false);

	$effect(() => {
		if (!open) return;
		const t = setTimeout(() => (open = false), duration);
		return () => clearTimeout(t);
	});

	function copyDetail() {
		if (!detail) return;
		navigator.clipboard.writeText(detail);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

{#if open}
	<div class="toast-wrapper" class:error={type === 'error'} class:success={type === 'success'}>
		<div class="toast-body">
			<span class="toast-message">{message}</span>
			{#if detail}
				<button type="button" class="toast-copy" onclick={copyDetail}>
					{copied ? '✓' : 'Copy ID'}
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
	.toast-wrapper {
		position: fixed;
		bottom: calc(var(--tab-h, 76px) + 12px);
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		min-width: 280px;
		max-width: calc(100% - 32px);
		animation: toast-in 240ms cubic-bezier(0.32, 0.72, 0, 1);
		border-radius: 14px;
		padding: 12px 16px;
		background: var(--color-surface-1, #fff);
		box-shadow:
			0 4px 24px rgb(0 0 0 / 0.12),
			0 1px 4px rgb(0 0 0 / 0.08);
		border: 1px solid var(--color-border, #e5e5e5);
	}

	.toast-wrapper.error {
		border-color: var(--color-expense, #ef4444);
		background: color-mix(in oklab, var(--color-expense, #ef4444) 6%, var(--color-surface-1, #fff));
	}

	.toast-wrapper.success {
		border-color: var(--ok, #16a34a);
		background: color-mix(in oklab, var(--ok, #16a34a) 6%, var(--color-surface-1, #fff));
	}
	.toast-wrapper.success .toast-message {
		color: var(--ok-ink, #15803d);
	}

	.toast-body {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.toast-message {
		flex: 1;
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-primary, #1a1a1a);
	}

	.toast-copy {
		flex-shrink: 0;
		font-size: 12px;
		font-weight: 500;
		padding: 4px 10px;
		border-radius: 8px;
		background: var(--color-bg-1, #f5f5f5);
		color: var(--color-text-subtle, #666);
		border: none;
		cursor: pointer;
		transition: background 150ms;
	}

	.toast-copy:active {
		background: var(--color-bg-2, #e5e5e5);
	}

	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}
</style>
