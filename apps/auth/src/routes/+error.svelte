<script lang="ts">
	import { page } from '$app/state';
	import AuthShell from '$lib/components/AuthShell.svelte';

	const status = $derived(page.status);
	const isMissing = $derived(status === 404);
	const correlationId = $derived(
		(page.error as { correlationId?: string } | null)?.correlationId ?? null
	);

	let copied = $state(false);
	async function copyId() {
		if (!correlationId) return;
		await navigator.clipboard.writeText(correlationId);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<svelte:head>
	<title>Error — Nexo</title>
</svelte:head>

<AuthShell
	mood="error"
	eyebrow="error · {String(status).padStart(3, '0')}"
	heading={isMissing ? 'Page not found' : 'Something went wrong'}
	sub={isMissing
		? "Whatever you're looking for, it's not here."
		: "That wasn't supposed to happen. Try again or go back."}
>
	{#if correlationId}
		<div class="receipt">
			<div class="receipt-head">
				<span>incident ref</span>
				<button type="button" class="copy" onclick={copyId} aria-live="polite">
					{copied ? 'copied' : 'copy'}
				</button>
			</div>
			<code class="receipt-id">{correlationId}</code>
		</div>
	{/if}

	<a href="/login" class="back-link">
		<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" class="back-icon">
			<path d="M10 3L5 8l5 5" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
		<span>Back to sign in</span>
	</a>
</AuthShell>

<style>
	.receipt {
		margin-bottom: 4px;
		padding: 10px 12px;
		background: var(--color-bg-1);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-subtle);
	}

	.receipt-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-family: var(--font-mono);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-text-faint);
		margin-bottom: 4px;
	}

	.copy {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 2px 6px;
		border: 0;
		border-radius: var(--radius-xs);
		background: transparent;
		color: var(--color-accent);
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-out);
	}

	.copy:hover {
		background: color-mix(in oklab, var(--color-accent) 10%, transparent);
	}

	.receipt-id {
		display: block;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--color-text-primary);
		word-break: break-all;
		font-variant-numeric: tabular-nums;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		align-self: flex-start;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-0);
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-primary);
		text-decoration: none;
		transition:
			background var(--duration-fast) var(--ease-out),
			border-color var(--duration-fast) var(--ease-out),
			transform var(--duration-fast) var(--ease-out);
	}

	.back-link:hover {
		background: var(--color-bg-1);
		border-color: var(--color-border-strong);
		transform: translateY(-1px);
	}

	.back-icon {
		width: 14px;
		height: 14px;
		transition: transform var(--duration-fast) var(--ease-out);
	}

	.back-link:hover .back-icon {
		transform: translateX(-2px);
	}
</style>
