<script lang="ts">
	import type { Component } from 'svelte';

	export type BottomNavTab = {
		href: string;
		label: string;
		icon: Component<{ size?: number; strokeWidth?: number }>;
		exact?: boolean;
		active?: boolean;
	};

	let {
		tabs,
		currentPath
	}: {
		tabs: BottomNavTab[];
		currentPath: string;
	} = $props();

	function isActive(tab: BottomNavTab): boolean {
		if (tab.active !== undefined) return tab.active;
		if (tab.exact || tab.href === '/') return currentPath === tab.href;
		return currentPath === tab.href || currentPath.startsWith(tab.href + '/');
	}
</script>

<nav class="bottom-nav">
	{#each tabs as tab (tab.href)}
		{@const active = isActive(tab)}
		<a href={tab.href} class="tab" class:active>
			{#if active}
				<span class="indicator"></span>
			{/if}
			<tab.icon size={22} strokeWidth={active ? 2.1 : 1.7} />
			<span class="label">{tab.label}</span>
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
