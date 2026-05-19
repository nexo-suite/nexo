<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle = '',
		actions
	}: {
		title: string;
		subtitle?: string;
		actions?: Snippet;
	} = $props();
</script>

<header class="page-header">
	<div>
		{#if subtitle}
			<p class="t-label">{subtitle}</p>
		{/if}
		<h1 class="screen-title">{title}</h1>
	</div>
	{#if actions}
		<div class="actions">{@render actions()}</div>
	{/if}
</header>

<style>
	.page-header {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 12px;
		padding: 24px 0 16px;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
</style>
