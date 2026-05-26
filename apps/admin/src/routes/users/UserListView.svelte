<script lang="ts">
	import { fmtRelative, initials, displayName, entryStatus } from '$lib/utils';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import FilterChips from '$lib/components/FilterChips.svelte';
	import { m } from '$lib/paraglide/messages.js';

	type Entry =
		| {
				type: 'user';
				id: string;
				email: string;
				name: string;
				image: string | null;
				createdAt: string;
				allowed: boolean;
				apps: string[];
		  }
		| {
				type: 'invited';
				id: null;
				email: string;
				name: null;
				image: null;
				createdAt: string;
				allowed: boolean;
				apps: string[];
		  };

	type FilterStatus = 'all' | 'active' | 'invited' | 'blocked';

	interface Props {
		entries: Entry[];
		counts: { all: number; active: number; invited: number; blocked: number };
		searchQuery: string;
		filterStatus: FilterStatus;
		onopendetail: (entry: Entry) => void;
	}

	let {
		entries,
		counts,
		searchQuery = $bindable(''),
		filterStatus = $bindable('all' as FilterStatus),
		onopendetail
	}: Props = $props();
</script>

<div class="screen fade-in">
	<SearchInput bind:value={searchQuery} placeholder={m.users_search_placeholder()} />

	<FilterChips
		bind:value={filterStatus}
		options={[
			{ value: 'all', label: m.users_filter_all(), count: counts.all },
			{ value: 'active', label: m.users_filter_active(), count: counts.active },
			{ value: 'invited', label: m.users_filter_pending(), count: counts.invited },
			{ value: 'blocked', label: m.users_filter_blocked(), count: counts.blocked }
		]}
	/>

	<div class="row-stack">
		{#each entries as entry (entry.email)}
			{@const status = entryStatus(entry)}
			<button type="button" class="user-row" onclick={() => onopendetail(entry)}>
				<div class="avatar" class:owner={entry.type === 'user' && entry.allowed}>
					{initials(entry)}
				</div>
				<div class="user-body">
					<div class="user-name ellipsis">{displayName(entry)}</div>
					<div class="user-email ellipsis">{entry.email}</div>
					{#if status === 'active'}
						<div class="user-meta">
							{entry.apps.length === 1
								? m.users_meta_apps_one({
										count: entry.apps.length,
										when: fmtRelative(entry.createdAt)
									})
								: m.users_meta_apps_other({
										count: entry.apps.length,
										when: fmtRelative(entry.createdAt)
									})}
						</div>
					{:else if status === 'invited'}
						<div class="user-meta pending">{m.users_meta_invited()}</div>
					{:else}
						<div class="user-meta blocked">{m.users_meta_blocked()}</div>
					{/if}
				</div>
				<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"
					><path d="M6 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" /></svg
				>
			</button>
		{/each}
		{#if entries.length === 0}
			<div class="empty">
				<div class="em">○</div>
				{searchQuery ? m.users_empty_no_match() : m.users_empty_no_users()}
			</div>
		{/if}
	</div>
</div>

<style>
	.user-row {
		display: grid;
		grid-template-columns: 40px 1fr auto;
		gap: 12px;
		align-items: center;
		padding: 12px 14px;
		border-bottom: 1px solid var(--color-border-subtle);
		background: var(--color-surface-1);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: background var(--duration-fast) var(--ease-out);
		text-align: left;
		width: 100%;
	}

	.user-row:last-child {
		border-bottom: 0;
	}

	.user-row:hover,
	.user-row:active {
		background: var(--color-bg-1);
	}

	.user-body {
		min-width: 0;
	}

	.user-name {
		font-size: 15px;
		font-weight: 500;
		letter-spacing: -0.01em;
	}

	.user-email {
		color: var(--color-text-subtle);
		font-size: 12px;
		font-family: var(--font-mono);
		margin-top: 2px;
		max-width: 200px;
	}

	.user-meta {
		color: var(--color-text-faint);
		font-family: var(--font-mono);
		font-size: 10px;
		margin-top: 3px;
	}

	.user-meta.pending {
		color: var(--warn-ink);
	}

	.user-meta.blocked {
		color: var(--err-ink);
	}

	.chev {
		width: 18px;
		height: 18px;
		color: var(--color-text-faint);
		flex-shrink: 0;
	}

	.empty {
		text-align: center;
		padding: 32px 24px;
		color: var(--color-text-muted);
	}

	.empty .em {
		font-size: 32px;
		margin-bottom: 8px;
		opacity: 0.4;
	}
</style>
