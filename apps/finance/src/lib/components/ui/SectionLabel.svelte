<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		action,
		href,
		children
	}: { title: string; action?: string; href?: string; children?: Snippet } = $props();
</script>

<div class="flex items-baseline justify-between px-1 pt-6 pb-2.5">
	<span class="text-text-primary text-[13px] font-semibold tracking-tight">{title}</span>
	{#if action && href}
		<a
			{href}
			class="text-text-subtle pl-3 font-mono text-[12px] tracking-[0.04em] whitespace-nowrap"
		>
			{action}
		</a>
	{/if}
	{#if children}
		{@render children()}
	{/if}
</div>
