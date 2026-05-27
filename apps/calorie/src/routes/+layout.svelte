<script lang="ts">
	import '../app.css';
	import { page, navigating } from '$app/state';
	import { BottomNav, KonamiCode, PageShell, UpdatePrompt } from '@nexo/ui';
	import type { BottomNavTab } from '@nexo/ui';
	import { CalendarRange, House, Scale, Settings } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	let { children } = $props();

	const isOnboarding = $derived(page.url.pathname.startsWith('/onboarding'));
	const isScan = $derived(page.url.pathname === '/scan');
	const isFullBleed = $derived(isOnboarding || isScan);

	const tabs = $derived<BottomNavTab[]>([
		{ href: '/', label: m.nav_today(), icon: House, exact: true },
		{ href: '/weight', label: m.nav_weight(), icon: Scale },
		{ href: '/history', label: m.nav_history(), icon: CalendarRange },
		{ href: '/settings', label: m.nav_settings(), icon: Settings }
	]);
</script>

{#if navigating.to}
	<div class="nav-progress"></div>
{/if}

{#if isFullBleed}
	{@render children()}
{:else}
	<PageShell>
		{@render children()}
	</PageShell>
	<BottomNav {tabs} currentPath={page.url.pathname} />
	<UpdatePrompt bottomOffset="calc(var(--tab-h) + var(--safe-bot) + 12px)" />
{/if}

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
