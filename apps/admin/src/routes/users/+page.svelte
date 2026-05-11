<script lang="ts">
	import { enhance } from '$app/forms';
	import { X, Plus, UserPlus, ChevronLeft } from 'lucide-svelte';

	let { data, form } = $props();

	type Entry = (typeof data.entries)[number];

	let selectedEmail = $state<string | null>(null);
	let showInviteForm = $state(false);
	let inviteEmail = $state('');
	let confirmRemove = $state(false);

	// Always derived from live server data — stays in sync after grant/revoke
	const selectedEntry = $derived(
		selectedEmail ? (data.entries.find((e) => e.email === selectedEmail) ?? null) : null
	);

	function openDetail(entry: Entry) {
		selectedEmail = entry.email;
		confirmRemove = false;
	}

	function closeDetail() {
		selectedEmail = null;
		confirmRemove = false;
	}

	function initials(entry: Entry): string {
		if (entry.name) return entry.name[0].toUpperCase();
		return entry.email[0].toUpperCase();
	}

	function displayName(entry: Entry): string {
		return entry.name ?? entry.email;
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
						.length} signed in
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
				<button type="button" class="btn-ghost" onclick={() => (showInviteForm = false)}>
					Cancel
				</button>
				{#if form?.addError}
					<span class="error-text">{form.addError}</span>
				{/if}
			</form>
		{/if}

		<div class="user-list">
			{#each data.entries as entry (entry.email)}
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
						<span class="badge {entry.type === 'invited' ? 'badge-invited' : 'badge-active'}">
							{entry.type === 'invited' ? 'Invited' : 'Active'}
						</span>
						{#if entry.apps.length > 0}
							<div class="app-chips">
								{#each entry.apps as app (app)}
									<span class="app-chip">{app}</span>
								{/each}
							</div>
						{/if}
					</div>
				</button>
			{/each}

			{#if data.entries.length === 0}
				<div class="empty-state">
					<p>No users yet. Invite someone to get started.</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- RIGHT: detail pane -->
	<div class="detail-pane {selectedEntry ? 'open' : ''}">
		{#if selectedEntry}
			<button type="button" class="back-btn" onclick={closeDetail}>
				<ChevronLeft size={18} />
				Back
			</button>
			<div class="detail-header">
				<div class="detail-avatar {selectedEntry.type === 'invited' ? 'invited' : ''}">
					{initials(selectedEntry)}
				</div>
				<div class="detail-user-info">
					<p class="detail-name">{displayName(selectedEntry)}</p>
					{#if selectedEntry.name}
						<p class="detail-email">{selectedEntry.email}</p>
					{/if}
					<p class="detail-joined">
						{selectedEntry.type === 'invited' ? 'Invited' : 'Joined'}
						{fmtDate(selectedEntry.createdAt)}
					</p>
				</div>
				<button type="button" class="close-btn" onclick={closeDetail}>
					<X size={16} />
				</button>
			</div>

			{#if selectedEntry.type === 'user'}
				<div class="detail-section">
					<p class="section-label">App Access</p>
					<div class="app-columns">
						<div class="app-col">
							<p class="col-label">Assigned</p>
							<div class="app-col-items">
								{#each selectedEntry.apps as app (app)}
									<div class="app-col-item">
										<span class="app-chip-lg">{app}</span>
										<form
											method="POST"
											action="?/revokeAccess"
											use:enhance={() => {
												return async ({ update }) => {
													await update({ reset: false });
												};
											}}
										>
											<input type="hidden" name="userId" value={selectedEntry?.id} />
											<input type="hidden" name="app" value={app} />
											<button type="submit" class="chip-action remove" title="Revoke {app} access">
												<X size={12} />
											</button>
										</form>
									</div>
								{/each}
								{#if selectedEntry.apps.length === 0}
									<p class="col-empty">No apps assigned</p>
								{/if}
							</div>
						</div>

						<div class="app-col">
							<p class="col-label">Available</p>
							<div class="app-col-items">
								{#each data.knownApps.filter((a) => !selectedEntry?.apps.includes(a)) as app (app)}
									<div class="app-col-item">
										<span class="app-chip-lg available">{app}</span>
										<form
											method="POST"
											action="?/grantAccess"
											use:enhance={() => {
												return async ({ update }) => {
													await update({ reset: false });
												};
											}}
										>
											<input type="hidden" name="userId" value={selectedEntry?.id} />
											<input type="hidden" name="app" value={app} />
											<button type="submit" class="chip-action add" title="Grant {app} access">
												<Plus size={12} />
											</button>
										</form>
									</div>
								{/each}
								{#if data.knownApps.every((a) => selectedEntry?.apps.includes(a))}
									<p class="col-empty">All apps assigned</p>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}

			<div class="detail-danger">
				{#if !confirmRemove}
					<button type="button" class="btn-danger-ghost" onclick={() => (confirmRemove = true)}>
						Remove from whitelist
					</button>
				{:else}
					<div class="confirm-box">
						<p class="confirm-text">
							Remove <strong>{selectedEntry.email}</strong> from the access list? They won't be able to
							sign in.
						</p>
						<div class="confirm-actions">
							<form
								method="POST"
								action="?/removeEmail"
								use:enhance={() => {
									return async ({ update }) => {
										closeDetail();
										await update();
									};
								}}
							>
								<input type="hidden" name="email" value={selectedEntry.email} />
								<button type="submit" class="btn-danger">Yes, remove</button>
							</form>
							<button type="button" class="btn-ghost" onclick={() => (confirmRemove = false)}>
								Cancel
							</button>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="detail-empty">
				<p>Select a user to view details.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Fixed split-pane viewport — fills the main-content area */
	.workspace {
		display: grid;
		grid-template-columns: 1fr 0px;
		height: calc(100dvh - 64px); /* subtract layout top padding */
		gap: 0;
		transition: grid-template-columns var(--duration-base) var(--ease-out);
		overflow: hidden;
	}

	@media (min-width: 641px) {
		.workspace:has(.detail-pane.open) {
			grid-template-columns: 1fr 380px;
		}
	}

	/* LEFT pane */
	.list-pane {
		min-width: 0;
		overflow-y: auto;
		padding-right: 24px;
	}

	.pane-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 20px;
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

	.invite-form {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 16px;
		padding: 12px 14px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.invite-input {
		flex: 1;
		height: 34px;
		padding: 0 12px;
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

	.user-list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.user-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
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

	.badge {
		font-size: 10px;
		font-weight: 600;
		padding: 2px 7px;
		border-radius: 999px;
	}

	.badge-active {
		background: var(--color-accent-muted);
		color: var(--color-accent);
	}

	.badge-invited {
		background: var(--color-bg-2);
		color: var(--color-text-subtle);
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
		padding: 40px;
		text-align: center;
		color: var(--color-text-faint);
		font-size: 14px;
	}

	/* RIGHT pane */
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

	/* Back button — hidden on desktop */
	.back-btn {
		display: none;
	}

	/* Mobile layout */
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
			padding: 0 20px calc(var(--bottom-bar-height) + 20px);
			display: flex;
			flex-direction: column;
		}

		.detail-pane.open {
			transform: translateX(0);
			border-left: none;
			padding-left: 20px;
		}

		.back-btn {
			display: flex;
			align-items: center;
			gap: 4px;
			padding: 16px 0 12px;
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
	}

	.detail-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--color-text-faint);
		font-size: 13px;
	}

	.detail-header {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding-bottom: 20px;
		border-bottom: 1px solid var(--color-border-subtle);
		margin-bottom: 20px;
	}

	.detail-avatar {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--color-accent-muted);
		color: var(--color-accent);
		font-size: 18px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.detail-avatar.invited {
		background: var(--color-bg-2);
		color: var(--color-text-faint);
	}

	.detail-user-info {
		flex: 1;
		min-width: 0;
	}

	.detail-name {
		font-size: 15px;
		font-weight: 600;
		color: var(--color-text-primary);
		margin: 0 0 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.detail-email {
		font-size: 12px;
		color: var(--color-text-muted);
		margin: 0 0 4px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.detail-joined {
		font-size: 11px;
		color: var(--color-text-faint);
		margin: 0;
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
		margin: 0 0 14px;
	}

	.app-columns {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.app-col {
		min-width: 0;
	}

	.col-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-subtle);
		margin: 0 0 8px;
	}

	.app-col-items {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.app-col-item {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.app-chip-lg {
		font-size: 12px;
		font-weight: 600;
		padding: 5px 10px;
		border-radius: var(--radius-md);
		background: color-mix(in oklab, #6366f1 12%, transparent);
		color: #6366f1;
		text-transform: capitalize;
		flex: 1;
		text-align: center;
	}

	.app-chip-lg.available {
		background: var(--color-bg-2);
		color: var(--color-text-subtle);
	}

	.chip-action {
		width: 24px;
		height: 24px;
		border: none;
		border-radius: var(--radius-sm);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		flex-shrink: 0;
		transition: background var(--duration-fast) var(--ease-out);
	}

	.chip-action.remove {
		background: var(--color-danger-muted);
		color: var(--color-danger);
	}

	.chip-action.remove:hover {
		background: color-mix(in oklab, var(--color-danger) 20%, transparent);
	}

	.chip-action.add {
		background: var(--color-accent-muted);
		color: var(--color-accent);
	}

	.chip-action.add:hover {
		background: color-mix(in oklab, var(--color-accent) 22%, transparent);
	}

	.col-empty {
		font-size: 12px;
		color: var(--color-text-faint);
		font-style: italic;
		margin: 0;
	}

	.detail-danger {
		margin-top: auto;
		padding-top: 20px;
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

	/* Buttons */
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

	.btn-danger-ghost {
		display: inline-flex;
		align-items: center;
		padding: 7px 0;
		background: transparent;
		color: var(--color-danger);
		border: none;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		font-family: inherit;
	}

	.btn-danger-ghost:hover {
		text-decoration: underline;
	}
</style>
