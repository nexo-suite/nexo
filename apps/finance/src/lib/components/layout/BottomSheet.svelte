<script lang="ts">
	import { BottomSheet as Shared } from '@nexo/ui';
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		subtitle,
		children
	}: {
		open: boolean;
		title: string;
		subtitle?: string;
		children: Snippet;
	} = $props();
</script>

<Shared bind:open {title} {subtitle}>
	{@render children()}
</Shared>
