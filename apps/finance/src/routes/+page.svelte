<script lang="ts">
	import TrajectoryCard from '$lib/components/dashboard/TrajectoryCard.svelte';
	import CashflowRiver from '$lib/components/dashboard/CashflowRiver.svelte';
	import AccountCarousel from '$lib/components/dashboard/AccountCarousel.svelte';
	import WeekStrip from '$lib/components/dashboard/WeekStrip.svelte';
	import SpotlightCard from '$lib/components/dashboard/SpotlightCard.svelte';
	import UpcomingCompact from '$lib/components/dashboard/UpcomingCompact.svelte';
	import SectionLabel from '$lib/components/ui/SectionLabel.svelte';
	import { Search, X } from 'lucide-svelte';
	import { getIntlLocale } from '$lib/utils';

	let { data } = $props();

	let searchOpen = $state(false);
	let searchQuery = $state('');

	const displayName = $derived(data.settings?.displayName || 'there');
	const todayLabel = $derived(
		new Date().toLocaleDateString(getIntlLocale(), {
			weekday: 'long',
			month: 'short',
			day: 'numeric'
		})
	);
	const initials = $derived(
		(data.settings?.displayName || data.user?.name || 'U')
			.split(' ')
			.map((w: string) => w[0])
			.join('')
			.slice(0, 2)
			.toUpperCase()
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

<div class="px-4">
	<!-- App header -->
	<div class="flex items-center justify-between px-1 pt-2 pb-2.5">
		<div class="leading-tight">
			<div class="text-[22px] font-semibold tracking-tight">Hey, {displayName}</div>
			<div class="text-text-subtle mt-0.5 text-[13px]">{todayLabel}</div>
		</div>
		<div class="flex items-center gap-2">
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
			<div
				class="grid size-[38px] place-items-center rounded-full text-[13px] font-semibold tracking-wide text-white"
				style="background: linear-gradient(135deg, var(--color-accent), color-mix(in oklab, var(--color-accent) 50%, #000));
				       box-shadow: 0 0 0 2px var(--color-surface-1), 0 0 0 3px var(--color-border-subtle);"
			>
				{initials}
			</div>
		</div>
	</div>

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
	<SectionLabel title="Accounts" action="All {data.accounts.length} →" href="/accounts" />
	<AccountCarousel accounts={filteredAccounts} currency={data.settings?.currency ?? 'EUR'} />

	<!-- This week -->
	<SectionLabel title="This week" action="Next 30 →" href="/forecast" />
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
		<SectionLabel title="Coming up" action="All →" href="/forecast" />
		<UpcomingCompact
			events={filteredUpcoming}
			currency={data.settings?.currency ?? 'EUR'}
			hideCents={data.settings?.hideCents}
		/>
	{/if}
</div>
