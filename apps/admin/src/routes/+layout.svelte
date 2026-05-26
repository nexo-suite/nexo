<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page, navigating } from '$app/state';
	import { userMessage } from '@nexo/errors';
	import {
		BottomNav,
		ErrorBanner,
		installDiagnostics,
		KonamiCode,
		PageShell,
		setCurrentCorrelationId,
		Toast,
		UpdatePrompt
	} from '@nexo/ui';
	import type { BottomNavTab } from '@nexo/ui';
	import { Boxes, Users, Settings } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	let { data, children } = $props();

	onMount(() => {
		installDiagnostics('admin');
	});

	$effect(() => {
		setCurrentCorrelationId(data.correlationId ?? null);
	});

	const activeTab = $derived(
		page.url.pathname.startsWith('/users')
			? 'users'
			: page.url.pathname.startsWith('/settings')
				? 'settings'
				: 'home'
	);

	const tabs = $derived<BottomNavTab[]>([
		{ href: '/', label: m.nav_containers(), icon: Boxes, active: activeTab === 'home' },
		{ href: '/users', label: m.nav_users(), icon: Users, active: activeTab === 'users' },
		{ href: '/settings', label: m.nav_settings(), icon: Settings, active: activeTab === 'settings' }
	]);

	type ActionForm = {
		correlationId?: string;
		error?: string;
		toast?: string;
		toastType?: 'success' | 'error';
	} | null;
	const formResult = $derived(page.form as ActionForm);
	const errorCode = $derived(formResult?.error ?? null);
	const errorMsg = $derived(errorCode ? userMessage(errorCode) : null);
	const errorId = $derived(formResult?.correlationId ?? null);
	const errorKey = $derived(errorId ?? errorCode ?? '');
	const toastMsg = $derived(formResult?.toast ?? null);
	const toastType = $derived(formResult?.toastType ?? 'success');

	let dismissedFor = $state<string | null>(null);
	const showError = $derived(Boolean(errorMsg) && dismissedFor !== errorKey);

	let toastOpen = $state(false);
	let toastMessage = $state('');
	let toastTypeShown = $state<'success' | 'error'>('success');

	$effect(() => {
		if (toastMsg) {
			toastMessage = toastMsg;
			toastTypeShown = toastType;
			toastOpen = true;
		}
	});
</script>

{#if navigating.to}
	<div class="nav-progress"></div>
{/if}
<svelte:head>
	<title>{m.layout_title()}</title>
</svelte:head>
<PageShell>
	{#if showError && errorMsg}
		<ErrorBanner
			message={errorMsg}
			correlationId={errorId ?? undefined}
			onDismiss={() => (dismissedFor = errorKey)}
		/>
	{/if}
	{@render children()}
</PageShell>
<UpdatePrompt bottomOffset="calc(var(--tab-h) + var(--safe-bot) + 12px)" />
<Toast bind:open={toastOpen} type={toastTypeShown} message={toastMessage} duration={3000} />
<KonamiCode />
<BottomNav {tabs} currentPath={page.url.pathname} />

<style>
	.nav-progress {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		z-index: 100;
		background: var(--color-accent);
		animation: progress 1.5s ease-in-out infinite;
	}

	@keyframes progress {
		0% {
			transform: scaleX(0);
			transform-origin: left;
		}
		50% {
			transform: scaleX(0.7);
			transform-origin: left;
		}
		51% {
			transform-origin: right;
		}
		100% {
			transform: scaleX(0);
			transform-origin: right;
		}
	}
</style>
