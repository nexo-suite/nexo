<script lang="ts">
	import { enhance } from '$app/forms';
	import { X, UserPlus, ChevronLeft, Search } from 'lucide-svelte';
	import { SvelteSet } from 'svelte/reactivity';

	let { data, form } = $props();

	type Entry = (typeof data.entries)[number];

	let selectedEmail = $state<string | null>(null);
	let showInviteForm = $state(false);
	let inviteEmail = $state('');
	let confirmRemove = $state(false);
	let pendingApps = new SvelteSet<string>();

	function resetPendingApps(apps: string[]) {
		pendingApps.clear();
		for (const a of apps) pendingApps.add(a);
	}
	let accessSaved = $state(false);

	// Filters
	let searchQuery = $state('');
	let filterStatus = $state<'all' | 'active' | 'invited' | 'blocked'>('all');
	let filterApp = $state<string>('all');

	function appLabel(id: string): string {
		return data.knownApps.find((a) => a.id === id)?.label ?? id;
	}

	const selectedEntry = $derived(
		selectedEmail ? (data.entries.find((e) => e.email === selectedEmail) ?? null) : null
	);

	const accessDirty = $derived(
		selectedEntry?.type === 'user' &&
			(selectedEntry.apps.some((a) => !pendingApps.has(a)) ||
				[...pendingApps].some((a) => !selectedEntry.apps.includes(a)))
	);

	const filteredEntries = $derived(() => {
		return data.entries.filter((e) => {
			if (filterStatus === 'active' && !(e.type === 'user' && e.allowed)) return false;
			if (filterStatus === 'invited' && e.type !== 'invited') return false;
			if (filterStatus === 'blocked' && !(e.type === 'user' && !e.allowed)) return false;
			if (filterApp !== 'all' && !e.apps.includes(filterApp)) return false;
			if (searchQuery) {
				const q = searchQuery.toLowerCase();
				const name = (e.name ?? '').toLowerCase();
				const email = e.email.toLowerCase();
				if (!name.includes(q) && !email.includes(q)) return false;
			}
			return true;
		});
	});

	function openDetail(entry: Entry) {
		selectedEmail = entry.email;
		confirmRemove = false;
		accessSaved = false;
		resetPendingApps(entry.apps);
	}

	function closeDetail() {
		selectedEmail = null;
		confirmRemove = false;
		accessSaved = false;
		resetPendingApps([]);
	}

	function initials(entry: Entry): string {
		if (entry.name) return entry.name[0].toUpperCase();
		return entry.email[0].toUpperCase();
	}

	function displayName(entry: Entry): string {
		return entry.name ?? entry.email;
	}

	function badgeClass(entry: Entry) {
		if (entry.type === 'invited') return 'badge-invited';
		if (entry.allowed) return 'badge-active';
		return 'badge-blocked';
	}

	function badgeLabel(entry: Entry) {
		if (entry.type === 'invited') return 'Invited';
		if (entry.allowed) return 'Active';
		return 'Blocked';
	}

	const fmtDate = (iso: string) =>
		new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape') closeDetail();
	}}
/>

<div class="workspace">
	<!-- LEFT: user list -->
	<div class="list-pane">
		<div class="pane-header">
			<div>
				<h1 class="page-title">Users</h1>
				<p class="page-subtitle">
					{data.entries.length} total &middot; {data.entries.filter((e) => e.type === 'user')
						.length} created &middot; {data.entries.filter((e) => e.type === 'invited').length} invited
				</p>
			</div>
			<button type="button" class="btn-primary" onclick={() => (showInviteForm = !showInviteForm)}>
				<UserPlus size={14} />
				Invite
			</button>
		</div>

		{#if showInviteForm}
			<form
				method="POST"
				action="?/addEmail"
				class="invite-form"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						if (!form?.addError) {
							inviteEmail = '';
							showInviteForm = false;
						}
					};
				}}
			>
				<input
					name="email"
					type="email"
					bind:value={inviteEmail}
					placeholder="user@example.com"
					class="invite-input"
					autocomplete="off"
				/>
				<button type="submit" class="btn-primary">Add</button>
				<button type="button" class="btn-ghost" onclick={() => (showInviteForm = false)}
					>Cancel</button
				>
				{#if form?.addError}
					<span class="error-text">{form.addError}</span>
				{/if}
			</form>
		{/if}

		<!-- Search + filters -->
		<div class="filters">
			<div class="search-wrap">
				<Search size={14} class="search-icon" />
				<input
					type="search"
					class="search-input"
					placeholder="Search name or email…"
					bind:value={searchQuery}
				/>
			</div>
			<div class="filter-groups">
				<div class="filter-group">
					<span class="filter-group-label">Status</span>
					<div class="filter-chips">
						<button
							type="button"
							class="filter-chip {filterStatus === 'all' ? 'active' : ''}"
							onclick={() => (filterStatus = 'all')}>All</button
						>
						<span class="filter-sep">|</span>
						{#each ['active', 'invited', 'blocked'] as const as s (s)}
							<button
								type="button"
								class="filter-chip {filterStatus === s ? 'active' : ''}"
								onclick={() => (filterStatus = s)}
							>
								{s.charAt(0).toUpperCase() + s.slice(1)}
							</button>
						{/each}
					</div>
				</div>
				{#if data.knownApps.length > 0}
					<div class="filter-group">
						<span class="filter-group-label">App</span>
						<div class="filter-chips">
							<button
								type="button"
								class="filter-chip {filterApp === 'all' ? 'active' : ''}"
								onclick={() => (filterApp = 'all')}>All</button
							>
							<span class="filter-sep">|</span>
							{#each data.knownApps as app (app.id)}
								<button
									type="button"
									class="filter-chip app {filterApp === app.id ? 'active' : ''}"
									onclick={() => (filterApp = filterApp === app.id ? 'all' : app.id)}
								>
									{app.label}
								</button>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>

		<div class="user-list">
			{#each filteredEntries() as entry (entry.email)}
				<button
					type="button"
					class="user-row {selectedEmail === entry.email ? 'selected' : ''}"
					onclick={() => openDetail(entry)}
				>
					<div class="user-avatar {entry.type === 'invited' ? 'invited' : ''}">
						{initials(entry)}
					</div>
					<div class="user-info">
						<span class="user-name">{displayName(entry)}</span>
						{#if entry.name}
							<span class="user-email-sub">{entry.email}</span>
						{/if}
					</div>
					<div class="user-meta">
						<span class="badge {badgeClass(entry)}">{badgeLabel(entry)}</span>
						{#if entry.apps.length > 0}
							<div class="app-chips">
								{#each entry.apps as app (app)}
									<span class="app-chip">{appLabel(app)}</span>
								{/each}
							</div>
						{/if}
					</div>
				</button>
			{/each}

			{#if filteredEntries().length === 0}
				<div class="empty-state">
					<p>
						{data.entries.length === 0
							? 'No users yet. Invite someone to get started.'
							: 'No users match the current filters.'}
					</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- RIGHT: detail pane -->
	<div class="detail-pane {selectedEntry ? 'open' : ''}">
		{#if selectedEntry}
			<!-- Mobile back button -->
			<button type="button" class="back-btn" onclick={closeDetail}>
				<ChevronLeft size={18} />
				Back
			</button>

			<!-- Profile card -->
			<div class="profile-card">
				<div class="profile-avatar {selectedEntry.type === 'invited' ? 'invited' : ''}">
					{initials(selectedEntry)}
				</div>
				<div class="profile-info">
					<p class="profile-name">{displayName(selectedEntry)}</p>
					{#if selectedEntry.name}
						<p class="profile-email">{selectedEntry.email}</p>
					{/if}
					<div class="profile-meta">
						<span class="badge {badgeClass(selectedEntry)}">{badgeLabel(selectedEntry)}</span>
						<span class="profile-date">
							{selectedEntry.type === 'invited' ? 'Invited' : 'Joined'}
							{fmtDate(selectedEntry.createdAt)}
						</span>
					</div>
				</div>
				<!-- Desktop close -->
				<button type="button" class="close-btn" onclick={closeDetail} aria-label="Close">
					<X size={15} />
				</button>
			</div>

			<!-- App access + actions (signed-in users only) -->
			{#if selectedEntry.type === 'user'}
				<form
					method="POST"
					action="?/updateAccess"
					use:enhance={() =>
						async ({ update }) => {
							await update({ reset: false });
							accessSaved = true;
							setTimeout(() => (accessSaved = false), 2000);
						}}
				>
					<input type="hidden" name="userId" value={selectedEntry.id} />
					{#each [...pendingApps] as app (app)}
						<input type="hidden" name="apps" value={app} />
					{/each}

					<div class="detail-section">
						<p class="section-label">App Access</p>
						<div class="access-list">
							{#each data.knownApps as app (app.id)}
								{@const granted = pendingApps.has(app.id)}
								<label class="access-row">
									<div class="access-app-info">
										<span class="access-app-dot {granted ? 'granted' : ''}"></span>
										<span class="access-app-name">{app.label}</span>
									</div>
									<button
										type="button"
										class="toggle {granted ? 'on' : 'off'}"
										aria-pressed={granted}
										aria-label="{granted ? 'Revoke' : 'Grant'} {app.label} access"
										onclick={() => {
											if (granted) pendingApps.delete(app.id);
											else pendingApps.add(app.id);
											accessSaved = false;
										}}
									>
										<span class="toggle-thumb"></span>
									</button>
								</label>
							{/each}
						</div>
					</div>

					<!-- Actions row -->
					<div class="actions-row">
						<button type="submit" class="btn-primary btn-save" disabled={!accessDirty}>
							{accessSaved ? '✓ Saved' : 'Save access'}
						</button>
					</div>
				</form>

				<div class="danger-row">
					{#if !confirmRemove}
						<button
							type="button"
							class="btn-danger-outline"
							onclick={() => (confirmRemove = true)}
						>
							Remove from whitelist
						</button>
					{/if}
				</div>

				{#if confirmRemove}
					<div class="confirm-box">
						<p class="confirm-text">
							Remove <strong>{selectedEntry.email}</strong> from the access list? They won't be able to
							sign in.
						</p>
						<div class="confirm-actions">
							<form
								method="POST"
								action="?/removeEmail"
								use:enhance={() =>
									async ({ update }) => {
										closeDetail();
										await update();
									}}
							>
								<input type="hidden" name="email" value={selectedEntry.email} />
								<button type="submit" class="btn-danger">Yes, remove</button>
							</form>
							<button type="button" class="btn-ghost" onclick={() => (confirmRemove = false)}
								>Cancel</button
							>
						</div>
					</div>
				{/if}
			{:else}
				<!-- Invited-only: just the whitelist removal -->
				<div class="detail-danger">
					{#if !confirmRemove}
						<button type="button" class="btn-danger-outline" onclick={() => (confirmRemove = true)}>
							Remove from whitelist
						</button>
					{:else}
						<div class="confirm-box">
							<p class="confirm-text">
								Remove <strong>{selectedEntry.email}</strong> from the access list? They won't be able
								to sign in.
							</p>
							<div class="confirm-actions">
								<form
									method="POST"
									action="?/removeEmail"
									use:enhance={() =>
										async ({ update }) => {
											closeDetail();
											await update();
										}}
								>
									<input type="hidden" name="email" value={selectedEntry.email} />
									<button type="submit" class="btn-danger">Yes, remove</button>
								</form>
								<button type="button" class="btn-ghost" onclick={() => (confirmRemove = false)}
									>Cancel</button
								>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		{:else}
			<div class="detail-empty">
				<p>Select a user to view details.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	/* ── Layout ─────────────────────────────────────────────────── */
	.workspace {
		display: grid;
		grid-template-columns: 1fr 0px;
		height: calc(100dvh - 64px);
		gap: 0;
		transition: grid-template-columns var(--duration-base) var(--ease-out);
		overflow: hidden;
	}

	@media (min-width: 641px) {
		.workspace:has(.detail-pane.open) {
			grid-template-columns: 1fr 360px;
		}
	}

	.list-pane {
		min-width: 0;
		overflow-y: auto;
		padding-right: 24px;
	}

	/* ── Header ─────────────────────────────────────────────────── */
	.pane-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.page-title {
		font-size: 22px;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--color-text-primary);
		margin: 0 0 2px;
	}

	.page-subtitle {
		font-size: 13px;
		color: var(--color-text-faint);
		margin: 0;
	}

	/* ── Invite form ─────────────────────────────────────────────── */
	.invite-form {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 14px;
		padding: 10px 12px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.invite-input {
		flex: 1;
		height: 32px;
		padding: 0 10px;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		background: var(--color-bg-0);
		font-size: 13px;
		color: var(--color-text-primary);
		outline: none;
		font-family: inherit;
	}

	.invite-input:focus {
		border-color: var(--color-accent);
	}

	.error-text {
		font-size: 12px;
		color: var(--color-danger);
	}

	/* ── Filters ────────────────────────────────────────────────── */
	.filters {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 14px;
	}

	.search-wrap {
		position: relative;
	}

	:global(.search-icon) {
		position: absolute;
		left: 10px;
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-text-faint);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		height: 34px;
		padding: 0 10px 0 32px;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		background: var(--color-surface-1);
		font-size: 13px;
		color: var(--color-text-primary);
		outline: none;
		font-family: inherit;
		box-sizing: border-box;
	}

	.search-input:focus {
		border-color: var(--color-accent);
	}

	.filter-groups {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.filter-group {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.filter-group-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-faint);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		white-space: nowrap;
		min-width: 36px;
	}

	.filter-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
	}

	.filter-sep {
		color: var(--color-border-strong);
		font-size: 12px;
		user-select: none;
		line-height: 1;
	}

	.filter-chip {
		padding: 4px 10px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 500;
		border: 1px solid var(--color-border-default);
		background: var(--color-surface-1);
		color: var(--color-text-muted);
		cursor: pointer;
		font-family: inherit;
		transition:
			background var(--duration-fast) var(--ease-out),
			color var(--duration-fast) var(--ease-out),
			border-color var(--duration-fast) var(--ease-out);
	}

	.filter-chip:hover {
		background: var(--color-bg-1);
		border-color: var(--color-border-strong);
	}

	.filter-chip.active {
		background: var(--color-accent-muted);
		color: var(--color-accent);
		border-color: color-mix(in oklab, var(--color-accent) 30%, transparent);
	}

	.filter-chip.app.active {
		background: color-mix(in oklab, #6366f1 12%, transparent);
		color: #6366f1;
		border-color: color-mix(in oklab, #6366f1 30%, transparent);
	}

	/* ── User list ──────────────────────────────────────────────── */
	.user-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.user-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-lg);
		cursor: pointer;
		text-align: left;
		transition:
			border-color var(--duration-fast) var(--ease-out),
			background var(--duration-fast) var(--ease-out);
		width: 100%;
		font-family: inherit;
	}

	.user-row:hover {
		border-color: var(--color-border-strong);
		background: var(--color-surface-2);
	}

	.user-row.selected {
		border-color: var(--color-accent);
		background: var(--color-accent-muted);
	}

	.user-avatar {
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: var(--color-accent-muted);
		color: var(--color-accent);
		font-size: 13px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.user-avatar.invited {
		background: var(--color-bg-2);
		color: var(--color-text-faint);
	}

	.user-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.user-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.user-email-sub {
		font-size: 11px;
		color: var(--color-text-faint);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.user-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
	}

	.app-chips {
		display: flex;
		gap: 3px;
	}

	.app-chip {
		font-size: 10px;
		font-weight: 600;
		padding: 2px 6px;
		border-radius: 999px;
		background: color-mix(in oklab, #6366f1 12%, transparent);
		color: #6366f1;
		text-transform: capitalize;
	}

	.empty-state {
		padding: 40px 20px;
		text-align: center;
		color: var(--color-text-faint);
		font-size: 14px;
	}

	/* ── Badges ─────────────────────────────────────────────────── */
	.badge {
		font-size: 10px;
		font-weight: 600;
		padding: 2px 7px;
		border-radius: 999px;
		white-space: nowrap;
	}

	.badge-active {
		background: var(--color-accent-muted);
		color: var(--color-accent);
	}

	.badge-invited {
		background: var(--color-bg-2);
		color: var(--color-text-subtle);
	}

	.badge-blocked {
		background: color-mix(in oklab, #f59e0b 12%, transparent);
		color: #b45309;
	}

	/* ── Detail pane ────────────────────────────────────────────── */
	.detail-pane {
		overflow: hidden;
		border-left: 1px solid transparent;
		transition:
			border-color var(--duration-base) var(--ease-out),
			opacity var(--duration-base) var(--ease-out);
		opacity: 0;
		display: flex;
		flex-direction: column;
	}

	.detail-pane.open {
		border-left-color: var(--color-border-default);
		opacity: 1;
		overflow-y: auto;
		padding-left: 24px;
	}

	.detail-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--color-text-faint);
		font-size: 13px;
	}

	/* Back button — mobile only */
	.back-btn {
		display: none;
	}

	/* ── Profile card ───────────────────────────────────────────── */
	.profile-card {
		display: flex;
		align-items: flex-start;
		gap: 14px;
		padding: 20px 0 20px;
		border-bottom: 1px solid var(--color-border-subtle);
		margin-bottom: 20px;
	}

	.profile-avatar {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		background: var(--color-accent-muted);
		color: var(--color-accent);
		font-size: 20px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.profile-avatar.invited {
		background: var(--color-bg-2);
		color: var(--color-text-faint);
	}

	.profile-info {
		flex: 1;
		min-width: 0;
	}

	.profile-name {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.profile-email {
		font-size: 12px;
		color: var(--color-text-muted);
		margin: 0 0 8px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.profile-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.profile-date {
		font-size: 11px;
		color: var(--color-text-faint);
	}

	.close-btn {
		width: 28px;
		height: 28px;
		border: none;
		background: var(--color-bg-1);
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: var(--color-text-muted);
		flex-shrink: 0;
		transition: background var(--duration-fast) var(--ease-out);
	}

	.close-btn:hover {
		background: var(--color-bg-2);
	}

	/* ── App access list ────────────────────────────────────────── */
	.detail-section {
		padding-bottom: 20px;
		border-bottom: 1px solid var(--color-border-subtle);
		margin-bottom: 20px;
	}

	.section-label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-faint);
		margin: 0 0 12px;
	}

	.access-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.access-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 12px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-md);
		gap: 12px;
		cursor: default;
	}

	.access-app-info {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.access-app-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-border-strong);
		flex-shrink: 0;
		transition: background var(--duration-fast) var(--ease-out);
	}

	.access-app-dot.granted {
		background: var(--color-accent);
	}

	.access-app-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	/* Toggle switch */
	.toggle {
		position: relative;
		width: 36px;
		height: 20px;
		border-radius: 999px;
		border: none;
		cursor: pointer;
		flex-shrink: 0;
		padding: 0;
		transition: background var(--duration-fast) var(--ease-out);
	}

	.toggle.off {
		background: var(--color-border-strong);
	}

	.toggle.on {
		background: var(--color-accent);
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #fff;
		transition: transform var(--duration-fast) var(--ease-out);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.toggle.on .toggle-thumb {
		transform: translateX(16px);
	}

	/* Actions row */
	.actions-row {
		margin-bottom: 12px;
	}

	.btn-save {
		width: 100%;
		justify-content: center;
	}

	.btn-save:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.danger-row {
		margin-bottom: 16px;
	}

	/* ── Danger zone (invited-only path) ───────────────────────── */
	.detail-danger {
		margin-top: auto;
		padding-top: 20px;
		border-top: 1px solid var(--color-border-subtle);
	}

	.btn-danger-outline {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		padding: 8px 16px;
		background: transparent;
		color: var(--color-danger);
		border: 1px solid color-mix(in oklab, var(--color-danger) 30%, transparent);
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		font-family: inherit;
		transition:
			background var(--duration-fast) var(--ease-out),
			border-color var(--duration-fast) var(--ease-out);
	}

	.btn-danger-outline:hover {
		background: var(--color-danger-muted);
		border-color: color-mix(in oklab, var(--color-danger) 45%, transparent);
	}

	.confirm-box {
		padding: 14px;
		border: 1px solid color-mix(in oklab, var(--color-danger) 25%, transparent);
		background: var(--color-danger-muted);
		border-radius: var(--radius-lg);
	}

	.confirm-text {
		font-size: 13px;
		color: var(--color-text-primary);
		margin: 0 0 12px;
		line-height: 1.5;
	}

	.confirm-actions {
		display: flex;
		gap: 8px;
	}

	/* ── Buttons ────────────────────────────────────────────────── */
	.btn-primary {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		background: var(--color-accent);
		color: #fff;
		border: none;
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		transition: background var(--duration-fast) var(--ease-out);
		white-space: nowrap;
	}

	.btn-primary:hover {
		background: color-mix(in oklab, var(--color-accent) 85%, #000);
	}

	.btn-ghost {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		background: transparent;
		color: var(--color-text-muted);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		font-family: inherit;
		transition: background var(--duration-fast) var(--ease-out);
		white-space: nowrap;
	}

	.btn-ghost:hover {
		background: var(--color-bg-1);
	}

	.btn-danger {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 14px;
		background: var(--color-danger);
		color: #fff;
		border: none;
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		white-space: nowrap;
	}

	/* ── Mobile ─────────────────────────────────────────────────── */
	@media (max-width: 640px) {
		.workspace {
			display: block;
			height: auto;
			overflow: visible;
		}

		.list-pane {
			padding-right: 0;
			overflow-y: visible;
		}

		.detail-pane {
			position: fixed;
			inset: 0;
			z-index: 50;
			background: var(--color-bg-0);
			border-left: none;
			opacity: 1;
			transform: translateX(100%);
			transition: transform var(--duration-base) var(--ease-out);
			overflow-y: auto;
			padding: 0 16px calc(var(--bottom-bar-height) + env(safe-area-inset-bottom) + 20px);
			display: flex;
			flex-direction: column;
		}

		.detail-pane.open {
			transform: translateX(0);
			border-left: none;
			padding-left: 16px;
		}

		.back-btn {
			display: flex;
			align-items: center;
			gap: 4px;
			padding: 16px 0 8px;
			background: none;
			border: none;
			font-size: 14px;
			font-weight: 600;
			color: var(--color-accent);
			cursor: pointer;
			font-family: inherit;
		}

		.close-btn {
			display: none;
		}

		.profile-card {
			padding-top: 8px;
		}
	}
</style>
