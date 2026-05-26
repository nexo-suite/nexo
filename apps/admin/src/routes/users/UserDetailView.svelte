<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SvelteSet } from 'svelte/reactivity';
	import { fmtRelative, initials, displayName, entryStatus } from '$lib/utils';
	import AppAccessSection from './AppAccessSection.svelte';
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

	type KnownApp = { id: string; label: string };

	interface Props {
		entry: Entry;
		knownApps: readonly KnownApp[];
		pendingApps: SvelteSet<string>;
		onclose: () => void;
	}

	let { entry, knownApps, pendingApps, onclose }: Props = $props();

	let confirmRemove = $state(false);

	const statusLabel = $derived.by(() => {
		const s = entryStatus(entry);
		if (s === 'active') return m.users_filter_active();
		if (s === 'invited') return m.users_filter_pending();
		return m.users_filter_blocked();
	});
</script>

<div class="screen fade-in">
	<button type="button" class="back-nav" onclick={onclose}>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
			><path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" /></svg
		>
		{m.users_back()}
	</button>

	<div class="profile-card">
		<div class="avatar-lg" class:owner={entry.type === 'user' && entry.allowed}>
			{initials(entry)}
		</div>
		<div class="profile-name">{displayName(entry)}</div>
		<div class="profile-email">{entry.email}</div>
		<div class="profile-pills">
			<span
				class="pill {entryStatus(entry) === 'active'
					? 'ok'
					: entryStatus(entry) === 'invited'
						? 'warn'
						: 'err'}">{statusLabel}</span
			>
		</div>
	</div>

	<div class="row-stack">
		<div class="kv">
			<span class="k">{m.users_kv_joined()}</span>
			<span class="v">{fmtRelative(entry.createdAt)}</span>
		</div>
		<div class="kv">
			<span class="k">{m.users_kv_type()}</span>
			<span class="v">{entry.type}</span>
		</div>
	</div>

	{#if entry.type === 'user'}
		<AppAccessSection {entry} {knownApps} {pendingApps} />

		<div class="section-h" style="margin-top:8px"><h3>{m.users_danger_zone()}</h3></div>
		<div class="row-stack">
			{#if !confirmRemove}
				<button type="button" class="danger-row" onclick={() => (confirmRemove = true)}>
					<div>
						<div class="danger-title">{m.users_remove_allowlist_title()}</div>
						<div class="danger-sub">{m.users_remove_allowlist_sub()}</div>
					</div>
					<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"
						><path d="M6 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" /></svg
					>
				</button>
			{:else}
				<div style="padding:14px">
					<p class="confirm-text">
						{m.users_confirm_remove_user({ email: entry.email })}
					</p>
					<div class="confirm-actions">
						<form
							method="POST"
							action="?/removeEmail"
							use:enhance={() =>
								async ({ update }) => {
									onclose();
									await update();
								}}
						>
							<input type="hidden" name="email" value={entry.email} />
							<button type="submit" class="btn btn-danger">{m.users_remove_user_button()}</button>
						</form>
						<button type="button" class="btn btn-ghost" onclick={() => (confirmRemove = false)}
							>{m.common_cancel()}</button
						>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<div class="section-h"><h3>{m.users_danger_zone()}</h3></div>
		<div class="row-stack">
			{#if !confirmRemove}
				<button type="button" class="danger-row" onclick={() => (confirmRemove = true)}>
					<div>
						<div class="danger-title">{m.users_remove_invite_title()}</div>
						<div class="danger-sub">{m.users_remove_invite_sub()}</div>
					</div>
					<svg class="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"
						><path d="M6 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" /></svg
					>
				</button>
			{:else}
				<div style="padding:14px">
					<p class="confirm-text">
						{m.users_confirm_remove_invite({ email: entry.email })}
					</p>
					<div class="confirm-actions">
						<form
							method="POST"
							action="?/removeEmail"
							use:enhance={() =>
								async ({ update }) => {
									onclose();
									await update();
								}}
						>
							<input type="hidden" name="email" value={entry.email} />
							<button type="submit" class="btn btn-danger">{m.common_remove()}</button>
						</form>
						<button type="button" class="btn btn-ghost" onclick={() => (confirmRemove = false)}
							>{m.common_cancel()}</button
						>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.back-nav {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 15px;
		font-weight: 500;
		color: var(--accent-ink);
		background: transparent;
		border: 0;
		cursor: pointer;
		padding: 0;
		-webkit-tap-highlight-color: transparent;
	}

	.back-nav svg {
		width: 20px;
		height: 20px;
	}

	.profile-card {
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.avatar-lg {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 22px;
		font-weight: 600;
		background: var(--color-bg-2);
		color: var(--color-text-muted);
		margin-bottom: 12px;
	}

	.avatar-lg.owner {
		background: color-mix(in oklab, var(--color-accent) 14%, var(--color-surface-1));
		color: var(--accent-ink);
		border: 1px solid color-mix(in oklab, var(--color-accent) 30%, transparent);
	}

	.profile-name {
		font-size: 18px;
		font-weight: 600;
		letter-spacing: -0.015em;
	}

	.profile-email {
		color: var(--color-text-subtle);
		font-size: 13px;
		font-family: var(--font-mono);
		margin-top: 2px;
	}

	.profile-pills {
		display: flex;
		gap: 6px;
		margin-top: 10px;
	}

	.section-h {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 4px;
	}

	.section-h h3 {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--color-text-subtle);
		text-transform: uppercase;
	}

	.chev {
		width: 18px;
		height: 18px;
		color: var(--color-text-faint);
		flex-shrink: 0;
	}

	.danger-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 14px;
		background: transparent;
		border: 0;
		width: 100%;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		text-align: left;
	}

	.danger-title {
		font-size: 14px;
		color: var(--err-ink);
		font-weight: 500;
	}

	.danger-sub {
		font-size: 12px;
		color: var(--color-text-subtle);
		margin-top: 2px;
	}

	.confirm-text {
		font-size: 14px;
		line-height: 1.5;
		margin: 0 0 12px;
		color: var(--color-text-primary);
	}

	.confirm-actions {
		display: flex;
		gap: 8px;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 44px;
		padding: 0 18px;
		font-size: 15px;
		font-weight: 500;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			background var(--duration-fast) var(--ease-out),
			transform var(--duration-fast) var(--ease-out);
		background: transparent;
		color: var(--color-text-primary);
	}

	.btn-ghost {
		background: var(--color-bg-2);
	}

	.btn-danger {
		background: var(--err);
		color: #fff;
		font-weight: 600;
	}
</style>
