<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages';
	import {
		Home,
		CreditCard,
		BarChart2,
		Layers,
		Receipt,
		TrendingUp,
		Users,
		Bookmark
	} from 'lucide-svelte';

	const topLeft = $derived([
		{ href: '/', label: m.nav_home(), icon: Home },
		{ href: '/accounts', label: m.nav_accounts(), icon: CreditCard }
	]);

	const topRight = $derived([{ href: '/forecast', label: m.nav_forecast(), icon: BarChart2 }]);

	const groupItems = $derived([
		{ href: '/expenses', label: m.nav_expenses(), icon: Receipt },
		{ href: '/income', label: m.nav_income(), icon: TrendingUp },
		{ href: '/debt', label: 'Debt', icon: Users },
		{ href: '/commitments', label: 'Commitments', icon: Bookmark }
	]);

	let popoverOpen = $state(false);

	const url = $derived(page.url);
	const groupActive = $derived(groupItems.some((i) => url.pathname === i.href));

	function togglePopover() {
		popoverOpen = !popoverOpen;
	}

	function closePopover() {
		popoverOpen = false;
	}

	function handleBackdropPointer(e: PointerEvent) {
		if (popoverOpen) {
			e.stopPropagation();
			closePopover();
		}
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') closePopover();
	}}
/>

<!-- Backdrop to catch outside taps -->
{#if popoverOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-40" onpointerdown={handleBackdropPointer}></div>
{/if}

<nav
	class="border-border bg-surface/95 fixed right-0 bottom-0 left-0 z-50 flex
	       min-h-(--bottom-nav-height) items-center justify-around border-t px-1 backdrop-blur-md"
	style="padding-bottom: env(safe-area-inset-bottom);"
>
	{#each topLeft as item (item.href)}
		{@const active = url.pathname === item.href}
		<a
			href={item.href}
			class="relative flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 pt-2 pb-1.5
			       transition-colors duration-150
			       {active ? 'text-primary-500' : 'text-neutral hover:text-primary-400'}"
		>
			{#if active}
				<span class="bg-primary-500 absolute top-0 h-0.5 w-5 rounded-full"></span>
			{/if}
			<item.icon size={20} stroke-width={active ? 2.5 : 1.75} />
			<span class="text-[10px] leading-none font-medium">{item.label}</span>
		</a>
	{/each}

	<!-- Group nav item -->
	<div class="relative flex flex-1 flex-col items-center">
		{#if popoverOpen}
			<div
				class="border-border bg-surface absolute bottom-full left-1/2 mb-2
				       -translate-x-1/2 overflow-hidden rounded-xl border shadow-lg"
				style="width: 188px;"
			>
				<div class="grid grid-cols-2">
					{#each groupItems as item (item.href)}
						{@const active = url.pathname === item.href}
						<a
							href={item.href}
							onclick={closePopover}
							class="flex flex-col items-center gap-1 px-3 py-3 transition-colors duration-150
							       {active
								? 'bg-primary-500/8 text-primary-500'
								: 'text-neutral hover:bg-surface-muted hover:text-primary-400'}"
						>
							<item.icon size={18} stroke-width={active ? 2.5 : 1.75} />
							<span class="text-[10px] leading-none font-medium">{item.label}</span>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<button
			type="button"
			onclick={togglePopover}
			class="relative flex w-full flex-col items-center gap-0.5 rounded-xl px-1 pt-2 pb-1.5
			       transition-colors duration-150
			       {groupActive || popoverOpen ? 'text-primary-500' : 'text-neutral hover:text-primary-400'}"
		>
			{#if groupActive}
				<span class="bg-primary-500 absolute top-0 h-0.5 w-5 rounded-full"></span>
			{/if}
			<Layers size={20} stroke-width={groupActive || popoverOpen ? 2.5 : 1.75} />
			<span class="text-[10px] leading-none font-medium">Flows</span>
		</button>
	</div>

	{#each topRight as item (item.href)}
		{@const active = url.pathname === item.href}
		<a
			href={item.href}
			class="relative flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 pt-2 pb-1.5
			       transition-colors duration-150
			       {active ? 'text-primary-500' : 'text-neutral hover:text-primary-400'}"
		>
			{#if active}
				<span class="bg-primary-500 absolute top-0 h-0.5 w-5 rounded-full"></span>
			{/if}
			<item.icon size={20} stroke-width={active ? 2.5 : 1.75} />
			<span class="text-[10px] leading-none font-medium">{item.label}</span>
		</a>
	{/each}
</nav>
