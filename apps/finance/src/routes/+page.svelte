<script lang="ts">
	import { SectionLabel, GreetingHeader, useNow } from '@nexo/ui';
	import TrajectoryCard from '$lib/components/dashboard/TrajectoryCard.svelte';
	import CashflowRiver from '$lib/components/dashboard/CashflowRiver.svelte';
	import AccountCarousel from '$lib/components/dashboard/AccountCarousel.svelte';
	import WeekStrip from '$lib/components/dashboard/WeekStrip.svelte';
	import SpotlightCard from '$lib/components/dashboard/SpotlightCard.svelte';
	import UpcomingCompact from '$lib/components/dashboard/UpcomingCompact.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import { Search, X } from '@lucide/svelte';
	import { getIntlLocale, formatCurrency } from '$lib/utils';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	let searchOpen = $state(false);
	let searchQuery = $state('');

	const displayName = $derived(data.profile?.displayName || data.user?.name || 'there');

	const todayLabel = $derived(
		new Date().toLocaleDateString(getIntlLocale(), {
			weekday: 'long',
			month: 'short',
			day: 'numeric'
		})
	);

	const clock = useNow();
	const timeLabel = $derived(
		clock.value.toLocaleTimeString(getIntlLocale(), { hour: '2-digit', minute: '2-digit' })
	);

	const greetDetails = $derived.by<string[]>(() => {
		const items: string[] = [timeLabel];
		const currency = data.settings?.currency ?? 'EUR';
		const liquid = data.forecast?.liquidBalance ?? 0;
		items.push(formatCurrency(liquid, currency, true));
		const delta = data.forecast?.delta ?? 0;
		if (delta > 0) items.push('▲ trending up');
		else if (delta < 0) items.push('▼ trending down');
		return items;
	});

	const spotlight = $derived(data.todayEvents?.[0] ?? null);

	const q = $derived(searchQuery.trim().toLowerCase());
	const filteredAccounts = $derived(
		q
			? data.accounts.filter((a: { name: string }) => a.name.toLowerCase().includes(q))
			: data.accounts
	);
	const filteredUpcoming = $derived(
		q
			? data.upcoming.filter((e: { label: string }) => e.label.toLowerCase().includes(q))
			: data.upcoming
	);
</script>

<div class="page">
	<GreetingHeader name={displayName} eyebrow={todayLabel} details={greetDetails}>
		{#snippet actions()}
			<button
				type="button"
				class="border-border-default bg-surface-1 text-text-muted active:bg-bg-1 active:text-text-primary grid size-[38px] place-items-center rounded-full border transition-colors"
				class:!border-accent={searchOpen}
				class:!text-accent={searchOpen}
				aria-label={m.dashboard_search_aria()}
				onclick={() => {
					searchOpen = !searchOpen;
					if (!searchOpen) searchQuery = '';
				}}
			>
				{#if searchOpen}
					<X size={17} strokeWidth={1.6} />
				{:else}
					<Search size={17} strokeWidth={1.6} />
				{/if}
			</button>
		{/snippet}
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
	</GreetingHeader>

	{#if searchOpen}
		<div class="mb-2 px-1">
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="text"
				bind:value={searchQuery}
				placeholder={m.dashboard_search_placeholder()}
				class="border-border-subtle bg-bg-1 text-text-primary h-10 w-full rounded-[var(--radius-md)] border px-3.5 text-[14px] outline-none focus:border-[var(--color-accent)]"
				autofocus
			/>
		</div>
	{/if}

	<!-- Trajectory hero -->
	<TrajectoryCard
		liquidBalance={data.forecast.liquidBalance}
		trajectory={data.forecast.trajectory}
		currency={data.settings?.currency ?? 'EUR'}
	/>

	<!-- Month pulse -->
	<div class="mt-3">
		<CashflowRiver
			monthlyIncome={data.monthlyIncome}
			monthlyExpenses={data.monthlyExpenses}
			currency={data.settings?.currency ?? 'EUR'}
		/>
	</div>

	<!-- Account carousel -->
	<SectionLabel
		variant="title"
		title={m.dashboard_section_accounts()}
		action={m.dashboard_section_accounts_action({ count: data.accounts.length })}
		href="/accounts"
	/>
	<AccountCarousel accounts={filteredAccounts} currency={data.settings?.currency ?? 'EUR'} />

	<!-- This week -->
	<SectionLabel
		variant="title"
		title={m.dashboard_section_this_week()}
		action={m.dashboard_section_this_week_action()}
		href="/forecast"
	/>
	<WeekStrip events={filteredUpcoming} weekStartDay={data.settings?.weekStartDay ?? 'monday'} />

	<!-- Today spotlight -->
	{#if spotlight && !q}
		<div class="mt-3.5">
			<SpotlightCard
				event={spotlight}
				currency={data.settings?.currency ?? 'EUR'}
				hideCents={data.settings?.hideCents}
			/>
		</div>
	{/if}

	<!-- Coming up -->
	{#if filteredUpcoming.length > 0}
		<SectionLabel
			variant="title"
			title={m.dashboard_section_coming_up()}
			action={m.dashboard_section_coming_up_action()}
			href="/forecast"
		/>
		<UpcomingCompact
			events={filteredUpcoming}
			currency={data.settings?.currency ?? 'EUR'}
			hideCents={data.settings?.hideCents}
		/>
	{:else if !q}
		<SectionLabel variant="title" title={m.dashboard_section_coming_up()} />
		<EmptyState
			emoji="🪺"
			title={m.dashboard_coming_up_empty_title()}
			sub={m.dashboard_coming_up_empty_sub()}
		/>
	{/if}
</div>

