<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { registerSW } from 'virtual:pwa-register';
	import { UpdatePrompt } from '@nexo/ui';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import OnboardingOverlay from '$lib/components/OnboardingOverlay.svelte';
	import TourResumePill from '$lib/components/TourResumePill.svelte';

	let { data, children } = $props();

	onMount(() => {
		if ('serviceWorker' in navigator) {
			registerSW({ immediate: true });
		}
	});
</script>

<div class="app-container">
	{@render children()}
</div>

<UpdatePrompt bottomOffset="calc(var(--tab-h) + var(--safe-bot) + 12px)" />
<BottomNav />
<TourResumePill />
<OnboardingOverlay connection={data.connection} />
