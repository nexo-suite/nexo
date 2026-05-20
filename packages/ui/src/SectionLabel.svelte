<script lang="ts">
	type Props = {
		title: string;
		subtitle?: string;
		right?: string;
		action?: string;
		href?: string;
		variant?: 'eyebrow' | 'title';
		rightTone?: 'muted' | 'error';
	};

	let {
		title,
		subtitle,
		right,
		action,
		href,
		variant = 'eyebrow',
		rightTone = 'muted'
	}: Props = $props();
</script>

<div class="sl sl-{variant}">
	{#if variant === 'eyebrow'}
		<span class="sl-text">
			<b>{title}</b>{#if subtitle}<span class="sl-subtitle"> · {subtitle}</span>{/if}
		</span>
	{:else}
		<span class="sl-text">{title}</span>
	{/if}
	{#if action && href}
		<a class="sl-action" {href}>{action}</a>
	{:else if right}
		<span class="sl-right" class:err={rightTone === 'error'}>{right}</span>
	{/if}
</div>

<style>
	.sl {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
	}
	.sl-eyebrow {
		padding: 24px 4px 10px;
	}
	.sl-title {
		padding: 24px 4px 10px;
	}
	.sl-eyebrow .sl-text {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
		white-space: nowrap;
	}
	.sl-eyebrow .sl-text b {
		color: var(--color-text-primary);
		font-weight: 600;
		letter-spacing: 0.04em;
	}
	.sl-title .sl-text {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: -0.015em;
		color: var(--color-text-primary);
	}
	.sl-right {
		font-size: 12px;
		color: var(--color-text-faint);
		font-family: var(--font-mono);
		letter-spacing: 0.04em;
		white-space: nowrap;
		flex-shrink: 0;
	}
	.sl-right.err {
		color: var(--err);
	}
	.sl-action {
		padding-left: 12px;
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.04em;
		color: var(--color-text-subtle);
		white-space: nowrap;
		text-decoration: none;
	}
</style>
