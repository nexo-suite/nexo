<script lang="ts">
	import { PageHeader, SectionLabel } from '@nexo/ui';
	import TrajectoryCard from '$lib/components/dashboard/TrajectoryCard.svelte';
	import CashflowRiver from '$lib/components/dashboard/CashflowRiver.svelte';
	import AccountCarousel from '$lib/components/dashboard/AccountCarousel.svelte';
	import WeekStrip from '$lib/components/dashboard/WeekStrip.svelte';
	import SpotlightCard from '$lib/components/dashboard/SpotlightCard.svelte';
	import UpcomingCompact from '$lib/components/dashboard/UpcomingCompact.svelte';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import { Search, X } from '@lucide/svelte';
	import { getIntlLocale } from '$lib/utils';

	let { data } = $props();

	let searchOpen = $state(false);
	let searchQuery = $state('');

	const displayName = $derived(data.settings?.displayName || data.user?.name || 'there');

	const todayLabel = $derived(
		new Date().toLocaleDateString(getIntlLocale(), {
			weekday: 'long',
			month: 'short',
			day: 'numeric'
		})
	);

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
	<PageHeader title="Hey, {displayName}" subtitle={todayLabel}>
		{#snippet actions()}
			<button
				type="button"
				class="border-border-default bg-surface-1 text-text-muted active:bg-bg-1 active:text-text-primary grid size-[38px] place-items-center rounded-full border transition-colors"
				class:!border-accent={searchOpen}
				class:!text-accent={searchOpen}
				aria-label="Search"
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
	</PageHeader>

	{#if searchOpen}
		<div class="mb-2 px-1">
			<!-- svelte-ignore a11y_autofocus -->
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Filter accounts & events..."
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

	<!-- Cashflow river -->
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
		title="Accounts"
		action="All {data.accounts.length} →"
		href="/accounts"
	/>
	<AccountCarousel accounts={filteredAccounts} currency={data.settings?.currency ?? 'EUR'} />

	<!-- This week -->
	<SectionLabel variant="title" title="This week" action="Next 30 →" href="/forecast" />
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
		<SectionLabel variant="title" title="Coming up" action="All →" href="/forecast" />
		<UpcomingCompact
			events={filteredUpcoming}
			currency={data.settings?.currency ?? 'EUR'}
			hideCents={data.settings?.hideCents}
		/>
	{/if}
</div>
