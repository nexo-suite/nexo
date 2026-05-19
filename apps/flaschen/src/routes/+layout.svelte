<script lang="ts">
	import '../app.css';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import UpdatePrompt from '$lib/components/UpdatePrompt.svelte';

	let { children } = $props();
</script>

<div class="app-container">
	{@render children()}
</div>

<UpdatePrompt />
<BottomNav />
