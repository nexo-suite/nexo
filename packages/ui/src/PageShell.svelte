<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		extraBottom = 0
	}: {
		children: Snippet;
		extraBottom?: number;
	} = $props();
</script>

<div class="page-shell">
	<main class="page-shell-body" style:--shell-bot-extra="{extraBottom}px">
		{@render children()}
	</main>
</div>

<style>
	.page-shell {
		height: 100dvh;
		max-width: var(--app-max-w);
		margin-inline: auto;
		background: var(--color-bg-1);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;
	}
	.page-shell-body {
		flex: 1;
		padding-top: var(--safe-top);
		padding-bottom: calc(var(--tab-h) + var(--safe-bot) + var(--shell-bot-extra, 0px));
		overflow-y: auto;
		overscroll-behavior-y: contain;
		-webkit-overflow-scrolling: touch;
	}
</style>
