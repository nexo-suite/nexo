<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { installDiagnostics } from '@nexo/ui';

	let { children } = $props();

	onMount(() => {
		installDiagnostics('landing');
	});
</script>

{@render children()}
