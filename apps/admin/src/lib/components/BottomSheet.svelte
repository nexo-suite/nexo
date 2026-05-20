<script lang="ts">
	import { BottomSheet as Shared } from '@nexo/ui';
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		subtitle,
		onClose,
		children
	}: {
		open: boolean;
		title: string;
		subtitle?: string;
		onClose?: () => void;
		children: Snippet;
	} = $props();

	let prevOpen = open;
	$effect(() => {
		if (prevOpen && !open) onClose?.();
		prevOpen = open;
	});
</script>

<Shared bind:open {title} {subtitle}>
	{@render children()}
</Shared>
