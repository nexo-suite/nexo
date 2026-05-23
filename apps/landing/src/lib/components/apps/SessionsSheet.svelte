<script lang="ts">
	import { enhance } from '$app/forms';
	import { DeviceListRow } from '@nexo/ui';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';

	type Session = {
		id: string;
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

	function buildMetaLines(s: Session): string[] {
		const lines: string[] = [];
		lines.push(`${s.browser} · ${s.os}${s.ip ? ` · ${s.ip}` : ''}`);
		if (s.isCurrent) {
			lines.push(m.sessions_active_now());
		} else if (s.lastActive) {
			const date = new Date(s.lastActive).toLocaleDateString(getLocale(), {
				month: 'short',
				day: 'numeric'
			});
			lines.push(m.sessions_last_active({ date }));
		}
		return lines;
	}
</script>

<p class="sheet-sub">{m.sessions_sub()}</p>
<div class="session-list">
	{#each sorted as session (session.id)}
		<DeviceListRow
			icon={session.icon}
			label={session.name ?? session.summary}
			metaLines={buildMetaLines(session)}
			isCurrent={session.isCurrent}
		>
			{#snippet actions()}
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
							placeholder={m.sessions_rename_placeholder()}
							maxlength="32"
						/>
						<button type="submit" class="session-rename-save">{m.sessions_rename_save()}</button>
					</form>
				{:else}
					<button
						type="button"
						class="session-action-btn"
						onclick={() => {
							renamingSessionId = session.id;
							renameValue = session.name ?? '';
						}}
						aria-label={m.sessions_rename_aria()}>✏️</button
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
							<input type="hidden" name="sessionId" value={session.id} />
							<button
								type="submit"
								class="session-action-btn danger"
								aria-label={m.sessions_revoke_aria()}>✕</button
							>
						</form>
					{/if}
				{/if}
			{/snippet}
		</DeviceListRow>
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
		<button type="submit" class="sheet-btn-danger full-width">{m.sessions_revoke_all()}</button>
	</form>
{/if}
<button type="button" class="sheet-done secondary" onclick={onclose}
	>{m.sheet_action_close()}</button
>

<style>
	.sheet-sub {
		font-size: 13px;
		color: var(--color-text-muted, #a1a1aa);
		margin-bottom: 16px;
	}
	.session-list {
		display: flex;
		flex-direction: column;
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
	.sheet-done.secondary {
		background: var(--color-bg-1, #fafafa);
		color: var(--color-text-primary, #18181b);
		border: 1px solid var(--color-border-default, #e5e5e5);
	}
</style>
