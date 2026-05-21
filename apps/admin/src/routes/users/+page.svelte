<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { PageHeader } from '@nexo/ui';
	import { UserPlus } from '@lucide/svelte';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import UserListView from './UserListView.svelte';
	import UserDetailView from './UserDetailView.svelte';
	import InviteView from './InviteView.svelte';

	let { data, form } = $props();

	type Entry = (typeof data.entries)[number];

	let view = $state<'list' | 'detail' | 'invite'>('list');
	let selectedEmail = $state<string | null>(null);
	let inviteEmail = $state('');
	let inviteSent = $state(false);
	let pendingApps = new SvelteSet<string>();
	let searchQuery = $state('');
	let filterStatus = $state<'all' | 'active' | 'invited' | 'blocked'>('all');

	const selectedEntry = $derived(
		selectedEmail ? (data.entries.find((e) => e.email === selectedEmail) ?? null) : null
	);

	const counts = $derived({
		all: data.entries.length,
		active: data.entries.filter((e) => e.type === 'user' && e.allowed).length,
		invited: data.entries.filter((e) => e.type === 'invited').length,
		blocked: data.entries.filter((e) => e.type === 'user' && !e.allowed).length
	});

	const filteredEntries = $derived(
		data.entries.filter((e) => {
			const status = e.type === 'invited' ? 'invited' : e.allowed ? 'active' : 'blocked';
			if (filterStatus !== 'all' && status !== filterStatus) return false;
			if (searchQuery) {
				const q = searchQuery.toLowerCase();
				if (!e.email.toLowerCase().includes(q) && !(e.name ?? '').toLowerCase().includes(q))
					return false;
			}
			return true;
		})
	);

	function openDetail(entry: Entry) {
		selectedEmail = entry.email;
		pendingApps.clear();
		for (const a of entry.apps) pendingApps.add(a);
		view = 'detail';
	}

	function closeDetail() {
		view = 'list';
		selectedEmail = null;
	}

	function openInvite() {
		inviteEmail = '';
		inviteSent = false;
		view = 'invite';
	}
</script>

{#if view === 'list'}
	<div class="page">
		<PageHeader title="Users" subtitle="{counts.active} active · {counts.invited} invited">
			{#snippet actions()}
				<button class="hdr-action" type="button" aria-label="Invite user" onclick={openInvite}>
					<UserPlus size={18} strokeWidth={1.7} />
				</button>
			{/snippet}
			{#snippet avatar()}
				<UserAvatarMenu />
			{/snippet}
		</PageHeader>
	</div>
	<UserListView
		entries={filteredEntries}
		{counts}
		bind:searchQuery
		bind:filterStatus
		onopendetail={openDetail}
	/>
{:else if view === 'detail' && selectedEntry}
	<UserDetailView
		entry={selectedEntry}
		knownApps={data.knownApps}
		{pendingApps}
		onclose={closeDetail}
	/>
{:else if view === 'invite'}
	<InviteView bind:inviteEmail bind:inviteSent {form} onclose={closeDetail} />
{/if}

<style>
	.hdr-action {
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		color: var(--color-text-subtle);
		cursor: pointer;
	}
</style>
