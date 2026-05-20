<script lang="ts">
	import { X } from '@lucide/svelte';

	let {
		message,
		label,
		correlationId,
		onDismiss
	}: {
		message: string;
		label?: string;
		correlationId?: string;
		onDismiss?: () => void;
	} = $props();

	let copied = $state(false);

	async function copyId() {
		if (!correlationId) return;
		try {
			await navigator.clipboard.writeText(correlationId);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			copied = false;
		}
	}
</script>

<div class="error-banner" role="alert">
	<div class="error-banner-body">
		{#if label}
			<span class="error-banner-label" aria-hidden="true">{label}</span>
		{/if}
		<p class="error-banner-msg">{message}</p>
		{#if correlationId}
			<p class="error-banner-sub">
				Ref: <code class="error-banner-id">{correlationId}</code>
			</p>
		{/if}
	</div>
	<div class="error-banner-actions">
		{#if correlationId}
			<button type="button" class="error-banner-copy" onclick={copyId}>
				{copied ? 'Copied!' : 'Copy'}
			</button>
		{/if}
		{#if onDismiss}
			<button
				type="button"
				class="error-banner-dismiss"
				onclick={onDismiss}
				aria-label="Dismiss error"
			>
				<X size={14} strokeWidth={1.8} />
			</button>
		{/if}
	</div>
</div>

<style>
	.error-banner {
		margin: 12px 16px 0;
		padding: 12px 14px;
		border-radius: var(--radius-lg, 14px);
		border: 1px solid color-mix(in oklab, var(--err, #ef4444) 30%, transparent);
		background: color-mix(in oklab, var(--err, #ef4444) 6%, transparent);
		display: flex;
		gap: 12px;
		align-items: center;
	}

	.error-banner-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.error-banner-label {
		font-family: var(--font-mono, ui-monospace);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--err, #ef4444);
	}

	.error-banner-msg {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		color: var(--err, #ef4444);
		word-break: break-word;
	}

	.error-banner-sub {
		margin: 0;
		font-size: 12px;
		color: color-mix(in oklab, var(--err, #ef4444) 70%, var(--color-text-subtle, #666));
	}

	.error-banner-id {
		font-family: var(--font-mono, ui-monospace);
		font-size: 11px;
		letter-spacing: 0.06em;
		background: color-mix(in oklab, var(--err, #ef4444) 10%, transparent);
		border-radius: var(--radius-sm, 6px);
		padding: 1px 5px;
	}

	.error-banner-actions {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.error-banner-copy {
		font-size: 11px;
		font-weight: 600;
		font-family: var(--font-mono, ui-monospace);
		padding: 4px 10px;
		border-radius: var(--radius-md, 10px);
		border: 1px solid color-mix(in oklab, var(--err, #ef4444) 30%, transparent);
		background: color-mix(in oklab, var(--err, #ef4444) 10%, transparent);
		color: var(--err, #ef4444);
		cursor: pointer;
	}

	.error-banner-dismiss {
		width: 26px;
		height: 26px;
		display: grid;
		place-items: center;
		border-radius: 999px;
		border: 0;
		background: transparent;
		color: var(--err, #ef4444);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: background 120ms ease-out;
	}

	.error-banner-dismiss:hover,
	.error-banner-dismiss:active {
		background: color-mix(in oklab, var(--err, #ef4444) 14%, transparent);
	}
</style>
