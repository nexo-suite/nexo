<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { registerSW } from 'virtual:pwa-register';
	import { page } from '$app/state';
	import { userMessage } from '@nexo/errors';
	import {
		installDiagnostics,
		setCurrentCorrelationId,
		Toast,
		UpdatePrompt,
		BottomNav
	} from '@nexo/ui';
	import type { BottomNavTab } from '@nexo/ui';
	import { LayoutDashboard, Bell, SlidersHorizontal, Settings } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';
	import OnboardingOverlay from '$lib/components/OnboardingOverlay.svelte';
	import TourResumePill from '$lib/components/TourResumePill.svelte';

	let { data, children } = $props();

	type ActionForm = { error?: string; correlationId?: string; toast?: string } | null;
	const formResult = $derived(page.form as ActionForm);
	const errorCode = $derived(formResult?.error ?? null);
	const errorMsg = $derived(errorCode ? userMessage(errorCode) : null);
	const errorId = $derived(formResult?.correlationId ?? null);
	const toastMsg = $derived(formResult?.toast ?? null);

	let errorOpen = $state(false);
	let successOpen = $state(false);
	let successMessage = $state('');

	$effect(() => {
		if (errorMsg) errorOpen = true;
	});

	$effect(() => {
		if (toastMsg) {
			successMessage = toastMsg;
			successOpen = true;
		}
	});

	onMount(() => {
		installDiagnostics('flaschen');
		if ('serviceWorker' in navigator) {
			registerSW({ immediate: true });
		}
	});

	$effect(() => {
		setCurrentCorrelationId(data.correlationId ?? null);
	});

	const tabs = $derived<BottomNavTab[]>([
		{ href: '/', label: m.nav_dashboard(), icon: LayoutDashboard },
		{ href: '/filters', label: m.nav_filters(), icon: SlidersHorizontal },
		{ href: '/devices', label: m.nav_devices(), icon: Bell },
		{ href: '/settings', label: m.nav_settings(), icon: Settings }
	]);
</script>

<div class="app-container">
	{@render children()}
</div>

<Toast bind:open={errorOpen} type="error" message={errorMsg ?? ''} detail={errorId ?? undefined} />
<Toast bind:open={successOpen} type="success" message={successMessage} duration={3000} />

<UpdatePrompt bottomOffset="calc(var(--tab-h) + var(--safe-bot) + 12px)" />
<BottomNav {tabs} currentPath={page.url.pathname} />
<TourResumePill />
<OnboardingOverlay connection={data.connection} />
