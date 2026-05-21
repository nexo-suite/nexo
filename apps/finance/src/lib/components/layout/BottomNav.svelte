<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import {
		Home,
		CreditCard,
		BarChart2,
		Layers,
		Settings,
		Receipt,
		TrendingUp,
		Users,
		Bookmark
	} from '@lucide/svelte';

	const tabs = $derived([
		{ href: '/', label: m.nav_home(), icon: Home },
		{ href: '/accounts', label: m.nav_accounts(), icon: CreditCard },
		{ href: '#flows', label: 'Flows', icon: Layers, isFlows: true },
		{ href: '/forecast', label: m.nav_forecast(), icon: BarChart2 },
		{ href: '/settings', label: 'Settings', icon: Settings }
	]);

	const flowItems = $derived([
		{ href: '/expenses', label: m.nav_expenses(), icon: Receipt },
		{ href: '/income', label: m.nav_income(), icon: TrendingUp },
		{ href: '/debt', label: 'Debt', icon: Users },
		{ href: '/commitments', label: 'Commitments', icon: Bookmark }
	]);

	let popoverOpen = $state(false);

	const url = $derived(page.url);
	const flowActive = $derived(flowItems.some((i) => url.pathname === i.href));

	const activeFlowColor = $derived(
		url.pathname === '/expenses'
			? 'var(--color-expense)'
			: url.pathname === '/income'
				? 'var(--color-income)'
				: url.pathname === '/debt'
					? 'var(--color-debt)'
					: url.pathname === '/commitments'
						? 'var(--color-text-muted)'
						: null
	);

	const flowSoftBg: Record<string, string> = {
		'/expenses': 'var(--expense-soft)',
		'/income': 'var(--income-soft)',
		'/debt': 'var(--debt-soft)',
		'/commitments': 'var(--color-bg-1)'
	};

	function togglePopover() {
		popoverOpen = !popoverOpen;
	}

	function closePopover() {
		popoverOpen = false;
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') closePopover();
	}}
/>

{#if popoverOpen}
	<!-- Scrim -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50"
		style="background: rgba(15,15,17,0.32); backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
		       transition: opacity var(--dur-base) var(--ease-out);"
		onpointerdown={closePopover}
	></div>

	<!-- Popover -->
	<div
		class="border-border-default bg-surface-1 fixed z-[55] rounded-[var(--radius-lg)] border p-1.5"
		style="left: 50%; transform: translateX(-50%); bottom: calc(var(--tab-h) + var(--safe-bot) + 8px);
		       width: 240px; box-shadow: 0 30px 60px -20px rgba(15,15,17,0.18), 0 8px 20px -10px rgba(15,15,17,0.10);"
	>
		{#each flowItems as item, i (item.href)}
			{@const active = url.pathname === item.href}
			{#if i === 3}
				<div class="bg-border-subtle mx-2 my-1 h-px"></div>
			{/if}
			<a
				href={item.href}
				onclick={closePopover}
				class="active:bg-bg-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14.5px] font-medium tracking-tight transition-colors
				       {active ? 'text-text-primary' : 'text-text-primary'}"
				style={active ? `background: ${flowSoftBg[item.href]};` : ''}
			>
				<span
					class="grid size-7 place-items-center rounded-[7px] text-[14px]"
					class:bg-[var(--expense-soft)]={item.href === '/expenses'}
					class:text-[var(--expense-ink)]={item.href === '/expenses'}
					class:bg-[var(--income-soft)]={item.href === '/income'}
					class:text-[var(--income-ink)]={item.href === '/income'}
					class:bg-[var(--debt-soft)]={item.href === '/debt'}
					class:text-[var(--debt-ink)]={item.href === '/debt'}
					class:bg-bg-1={item.href === '/commitments'}
					class:text-text-muted={item.href === '/commitments'}
				>
					<item.icon size={14} strokeWidth={1.8} />
				</span>
				<span class="flex-1">{item.label}</span>
				<span class="text-text-faint">
					<svg
						width="13"
						height="13"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="m9 6 6 6-6 6" /></svg
					>
				</span>
			</a>
		{/each}
	</div>
{/if}

<nav
	class="border-border-subtle fixed right-0 bottom-0 left-0 z-40 flex items-stretch border-t"
	style="height: calc(var(--tab-h) + var(--safe-bot)); padding-bottom: var(--safe-bot);
	       background: color-mix(in oklab, var(--color-bg-0) 88%, transparent);
	       backdrop-filter: blur(16px) saturate(140%); -webkit-backdrop-filter: blur(16px) saturate(140%);"
>
	{#each tabs as item (item.href)}
		{@const isFlows = 'isFlows' in item}
		{@const active = isFlows ? flowActive || popoverOpen : url.pathname === item.href}

		{#if isFlows}
			<button
				type="button"
				onclick={togglePopover}
				class="relative flex flex-1 flex-col items-center justify-center gap-1"
			>
				<span
					class="grid size-11 place-items-center rounded-full transition-colors"
					style="transition-duration: var(--dur-base); transition-timing-function: var(--ease-out);
					       background: {active
						? (activeFlowColor ?? 'var(--color-accent)')
						: 'var(--color-text-primary)'}; color: var(--color-bg-0);"
				>
					<item.icon size={20} strokeWidth={1.8} />
				</span>
				<span
					class="text-[10px] leading-none font-medium"
					style="color: {active ? 'var(--color-text-primary)' : 'var(--color-text-subtle)'};"
				>
					{item.label}
				</span>
			</button>
		{:else}
			<a
				href={item.href}
				class="relative flex flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1.5"
				style="color: {active ? 'var(--accent-ink)' : 'var(--color-text-subtle)'};"
			>
				{#if active}
					<span class="bg-accent absolute top-1.5 h-[3px] w-[22px] rounded-full"></span>
				{/if}
				<item.icon size={22} strokeWidth={active ? 2.1 : 1.6} />
				<span
					class="text-[10px] leading-none font-medium tracking-[0.02em]"
					style="color: {active ? 'var(--accent-ink)' : 'var(--color-text-subtle)'};"
				>
					{item.label}
				</span>
			</a>
		{/if}
	{/each}
</nav>
