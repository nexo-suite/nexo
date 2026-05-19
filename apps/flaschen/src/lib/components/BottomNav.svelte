<script lang="ts">
	import { page } from '$app/state';
	import { Home, Settings, Bell } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	const tabs = $derived([
		{ href: '/', label: m.nav_home(), icon: Home },
		{ href: '/devices', label: m.nav_devices(), icon: Bell },
		{ href: '/settings', label: m.nav_settings(), icon: Settings }
	]);

	const url = $derived(page.url);
</script>

<nav class="bottom-nav">
	{#each tabs as item (item.href)}
		{@const active = item.href === '/' ? url.pathname === '/' : url.pathname.startsWith(item.href)}
		<a href={item.href} class="tab" class:active>
			{#if active}
				<span class="indicator"></span>
			{/if}
			<item.icon size={22} strokeWidth={active ? 2.1 : 1.7} />
			<span class="label">{item.label}</span>
		</a>
	{/each}
</nav>

<style>
	.bottom-nav {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 40;
		display: flex;
		align-items: stretch;
		height: calc(var(--tab-h) + var(--safe-bot));
		padding-bottom: var(--safe-bot);
		border-top: 1px solid var(--color-border-subtle);
		background: color-mix(in oklab, var(--color-bg-0) 88%, transparent);
		backdrop-filter: blur(16px) saturate(140%);
		-webkit-backdrop-filter: blur(16px) saturate(140%);
	}
	.tab {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		padding-top: 6px;
		color: var(--color-text-subtle);
		text-decoration: none;
		position: relative;
	}
	.tab.active {
		color: var(--color-accent);
	}
	.indicator {
		position: absolute;
		top: 6px;
		width: 22px;
		height: 3px;
		border-radius: 999px;
		background: var(--color-accent);
	}
	.label {
		font-size: 10px;
		line-height: 1;
		font-weight: 500;
		letter-spacing: 0.02em;
	}
</style>
