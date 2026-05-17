<script lang="ts">
	import { enhance } from '$app/forms';

	type Session = {
		id: string;
		token: string;
		isCurrent: boolean;
		name: string | null;
		icon: string;
		device: string;
		browser: string;
		os: string;
		summary: string;
		ip: string | null;
		lastActive: Date;
		createdAt: Date;
	};

	let {
		sessions,
		onclose
	}: {
		sessions: Session[];
		onclose: () => void;
	} = $props();

	let renamingSessionId = $state<string | null>(null);
	let renameValue = $state('');

	const sorted = $derived(
		[...sessions].sort((a, b) => (b.isCurrent ? 1 : 0) - (a.isCurrent ? 1 : 0))
	);
</script>

<p class="sheet-sub">Where you're signed in right now.</p>
<div class="session-list">
	{#each sorted as session (session.id)}
		<div class="session-item" class:current={session.isCurrent}>
			<div class="session-icon">{session.icon}</div>
			<div class="session-info">
				<div class="session-top">
					{#if renamingSessionId === session.id}
						<form
							method="POST"
							action="?/renameSession"
							use:enhance={() => {
								return async ({ update }) => {
									await update({ reset: false });
									renamingSessionId = null;
								};
							}}
						>
							<input type="hidden" name="sessionId" value={session.id} />
							<input
								class="session-rename-input"
								type="text"
								name="name"
								bind:value={renameValue}
								placeholder="Name this session"
								maxlength="32"
							/>
							<button type="submit" class="session-rename-save">Done</button>
						</form>
					{:else}
						<span class="session-name">{session.name ?? session.summary}</span>
						{#if session.isCurrent}
							<span class="session-badge">This device</span>
						{/if}
					{/if}
				</div>
				<div class="session-meta">
					{session.browser} · {session.os}{session.ip ? ` · ${session.ip}` : ''}
				</div>
				<div class="session-meta">
					{#if session.isCurrent}
						Active now
					{:else if session.lastActive}
						Last active {new Date(session.lastActive).toLocaleDateString('en', {
							month: 'short',
							day: 'numeric'
						})}
					{/if}
				</div>
			</div>
			<div class="session-actions">
				<button
					type="button"
					class="session-action-btn"
					onclick={() => {
						renamingSessionId = session.id;
						renameValue = session.name ?? '';
					}}
					aria-label="Rename">✏️</button
				>
				{#if !session.isCurrent}
					<form
						method="POST"
						action="?/revokeSession"
						use:enhance={() => {
							return async ({ update }) => {
								await update({ reset: false });
							};
						}}
					>
						<input type="hidden" name="token" value={session.token} />
						<button type="submit" class="session-action-btn danger" aria-label="Revoke">✕</button>
					</form>
				{/if}
			</div>
		</div>
	{/each}
</div>
{#if sessions.length > 1}
	<form
		method="POST"
		action="?/revokeOtherSessions"
		use:enhance={() => {
			return async ({ update }) => {
				await update({ reset: false });
				onclose();
			};
		}}
	>
		<button type="submit" class="sheet-btn-danger full-width">Revoke all other sessions</button>
	</form>
{/if}
<button type="button" class="sheet-done secondary" onclick={onclose}>Close</button>

<style>
	.sheet-sub {
		font-size: 13px;
		color: var(--color-text-muted, #a1a1aa);
		margin-bottom: 16px;
	}
	.session-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.session-item {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 12px 0;
		border-bottom: 1px solid var(--color-border-subtle, #f0f0f0);
	}
	.session-item:last-child {
		border-bottom: none;
	}
	.session-item.current {
		background: color-mix(in oklab, var(--color-accent, #16a34a) 5%, transparent);
		border-radius: var(--radius-md, 12px);
		padding: 12px;
		margin: 0 -4px;
	}
	.session-icon {
		font-size: 22px;
		flex-shrink: 0;
		width: 32px;
		text-align: center;
		padding-top: 2px;
	}
	.session-info {
		flex: 1;
		min-width: 0;
	}
	.session-top {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}
	.session-top form {
		display: flex;
		gap: 6px;
		flex: 1;
	}
	.session-name {
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-primary, #18181b);
	}
	.session-badge {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 6px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--color-accent, #16a34a) 15%, transparent);
		color: color-mix(in oklab, var(--color-accent, #16a34a) 80%, #000);
	}
	.session-meta {
		font-size: 12px;
		color: var(--color-text-muted, #a1a1aa);
		margin-top: 2px;
	}
	.session-rename-input {
		flex: 1;
		font: inherit;
		font-size: 13px;
		padding: 4px 8px;
		border: 1px solid var(--color-border-default, #e5e5e5);
		border-radius: var(--radius-sm, 8px);
		background: var(--color-bg-1, #fafafa);
		outline: none;
	}
	.session-rename-input:focus {
		border-color: var(--color-accent, #16a34a);
	}
	.session-rename-save {
		font: inherit;
		font-size: 12px;
		font-weight: 600;
		padding: 4px 10px;
		border: none;
		border-radius: var(--radius-sm, 8px);
		background: var(--color-accent, #16a34a);
		color: #fff;
		cursor: pointer;
	}
	.session-actions {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
		padding-top: 2px;
	}
	.session-action-btn {
		width: 28px;
		height: 28px;
		border: none;
		background: var(--color-bg-1, #fafafa);
		border-radius: var(--radius-sm, 8px);
		cursor: pointer;
		font-size: 13px;
		display: grid;
		place-items: center;
		transition: background 150ms;
	}
	.session-action-btn:active {
		background: var(--color-surface-2, #f0f0f0);
	}
	.session-action-btn.danger {
		color: var(--color-expense, #dc2626);
		font-weight: 700;
	}
	.full-width {
		width: 100%;
		margin-top: 12px;
	}
	.sheet-btn-danger {
		display: block;
		padding: 12px;
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		text-align: center;
		border: none;
		border-radius: var(--radius-md, 12px);
		background: color-mix(in oklab, var(--color-expense, #dc2626) 10%, transparent);
		color: var(--color-expense, #dc2626);
		cursor: pointer;
		text-decoration: none;
	}
	.sheet-done {
		display: block;
		width: 100%;
		margin-top: 12px;
		padding: 14px;
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		text-align: center;
		border: none;
		border-radius: var(--radius-md, 12px);
		background: var(--color-accent, #16a34a);
		color: #fff;
		cursor: pointer;
	}
	.sheet-done.secondary {
		background: var(--color-bg-1, #fafafa);
		color: var(--color-text-primary, #18181b);
		border: 1px solid var(--color-border-default, #e5e5e5);
	}
</style>
