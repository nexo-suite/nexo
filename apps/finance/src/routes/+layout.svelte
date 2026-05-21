<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page, navigating } from '$app/state';
	import { userMessage } from '@nexo/errors';
	import {
		installDiagnostics,
		KonamiCode,
		PageShell,
		setCurrentCorrelationId,
		Toast,
		UpdatePrompt
	} from '@nexo/ui';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';

	let { data, children } = $props();

	onMount(() => {
		installDiagnostics('finance');
	});

	$effect(() => {
		setCurrentCorrelationId(data.correlationId ?? null);
	});

	const isLoginPage = $derived(page.url.pathname === '/login');

	type ActionForm = { error?: string; correlationId?: string; toast?: string } | null;
	const formResult = $derived(page.form as ActionForm);
	const errorCode = $derived(formResult?.error ?? null);
	const errorMsg = $derived(errorCode ? userMessage(errorCode) : null);
	const errorId = $derived(formResult?.correlationId ?? null);
	const toastMsg = $derived(formResult?.toast ?? null);

	let toastOpen = $state(false);
	let successOpen = $state(false);
	let successMessage = $state('');

	$effect(() => {
		if (errorMsg) toastOpen = true;
	});

	$effect(() => {
		if (toastMsg) {
			successMessage = toastMsg;
			successOpen = true;
		}
	});
</script>

{#if navigating.to}
	<div class="nav-progress"></div>
{/if}
{#if isLoginPage}
	{@render children()}
{:else}
	<PageShell>
		{@render children()}
	</PageShell>
{/if}

<Toast bind:open={toastOpen} type="error" message={errorMsg ?? ''} detail={errorId ?? undefined} />
<Toast bind:open={successOpen} type="success" message={successMessage} duration={3000} />

{#if !isLoginPage}
	<BottomNav />
{/if}
<UpdatePrompt bottomOffset="calc(var(--tab-h) + var(--safe-bot) + 12px)" />
<KonamiCode />

<style>
	.nav-progress {
		position: fixed;
		top: var(--safe-top);
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
