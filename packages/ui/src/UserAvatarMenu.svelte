<script lang="ts">
	import type { Snippet } from 'svelte';
	import { LogOut, ExternalLink } from '@lucide/svelte';

	type AppUser = { name?: string | null; email?: string | null; image?: string | null };
	type Variant = 'gradient' | 'subtle';
	type Labels = { account?: string; appsHub?: string; signOut?: string };

	let {
		user,
		displayName: displayNameProp,
		hubUrl,
		variant = 'gradient',
		signOutAction = '/auth/sign-out',
		labels,
		extras
	}: {
		user: AppUser | null;
		displayName?: string | null;
		hubUrl: string;
		variant?: Variant;
		signOutAction?: string;
		labels?: Labels;
		extras?: Snippet<[{ close: () => void }]>;
	} = $props();

	const displayName = $derived(
		displayNameProp?.trim() || user?.name?.trim() || user?.email?.split('@')[0] || 'You'
	);

	const initials = $derived(
		displayName
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('') || 'U'
	);

	const accountLabel = $derived(labels?.account ?? 'Account');
	const appsHubLabel = $derived(labels?.appsHub ?? 'Apps hub');
	const signOutLabel = $derived(labels?.signOut ?? 'Sign out');

	let open = $state(false);
	let avatarFailed = $state(false);
	let wrapperEl = $state<HTMLDivElement | null>(null);

	function handleDocClick(e: MouseEvent) {
		if (!open || !wrapperEl) return;
		if (!wrapperEl.contains(e.target as Node)) open = false;
	}
	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) open = false;
	}
	function close() {
		open = false;
	}
</script>

<svelte:window onclick={handleDocClick} onkeydown={handleKey} />

<div class="wrap" bind:this={wrapperEl}>
	<button
		type="button"
		class="trigger {variant}"
		onclick={() => (open = !open)}
		aria-label={accountLabel}
		aria-expanded={open}
		aria-haspopup="menu"
	>
		{#if user?.image && !avatarFailed}
			<img
				src={user.image}
				alt=""
				onerror={() => (avatarFailed = true)}
				referrerpolicy="no-referrer"
			/>
		{:else}
			<span class="trigger-initials">{initials}</span>
		{/if}
	</button>

	{#if open}
		<div class="popover" role="menu">
			<div class="user-card">
				<div class="user-avatar">
					{#if user?.image && !avatarFailed}
						<img src={user.image} alt="" referrerpolicy="no-referrer" />
					{:else}
						<span class="user-initials">{initials}</span>
					{/if}
				</div>
				<div class="user-info">
					<div class="user-name">{displayName}</div>
					{#if user?.email}
						<div class="user-email">{user.email}</div>
					{/if}
				</div>
			</div>

			{#if extras}
				{@render extras({ close })}
			{/if}

			<a
				class="menu-row"
				href={hubUrl}
				target="_blank"
				rel="noopener noreferrer"
				role="menuitem"
				onclick={close}
			>
				<ExternalLink size={15} strokeWidth={1.7} />
				<span>{appsHubLabel}</span>
			</a>

			<form method="POST" action={signOutAction} class="signout-form">
				<button type="submit" class="menu-row danger" role="menuitem">
					<LogOut size={15} strokeWidth={1.7} />
					<span>{signOutLabel}</span>
				</button>
			</form>
		</div>
	{/if}
</div>

<style>
	.wrap {
		position: relative;
		display: inline-flex;
	}
	.trigger {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 999px;
		cursor: pointer;
		overflow: hidden;
		padding: 0;
		flex-shrink: 0;
		transition: transform var(--duration-fast, 150ms) var(--ease-out);
	}
	.trigger.gradient {
		color: #fff;
		border: none;
		background: linear-gradient(
			135deg,
			var(--color-accent),
			color-mix(in oklab, var(--color-accent) 50%, #000)
		);
		box-shadow:
			0 0 0 2px var(--color-surface-1),
			0 0 0 3px var(--color-border-subtle);
	}
	.trigger.gradient:active {
		transform: scale(0.96);
	}
	.trigger.subtle {
		background: var(--color-bg-2);
		border: 1px solid var(--color-border-default);
	}
	.trigger.subtle:active {
		opacity: 0.85;
	}
	.trigger img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.trigger-initials {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.02em;
	}
	.trigger.subtle .trigger-initials {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 700;
		color: var(--color-text-muted);
	}

	.popover {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		z-index: 60;
		min-width: 240px;
		padding: 6px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md, 12px);
		box-shadow:
			0 12px 32px -12px rgba(0, 0, 0, 0.18),
			0 2px 6px rgba(0, 0, 0, 0.06);
		animation: pop-in 140ms var(--ease-out, ease-out);
	}

	@keyframes pop-in {
		from {
			opacity: 0;
			transform: translateY(-4px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}

	.user-card {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px 10px;
		border-bottom: 1px solid var(--color-border-subtle);
		margin-bottom: 4px;
	}
	.user-avatar {
		width: 36px;
		height: 36px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--color-accent) 14%, var(--color-bg-1));
		display: grid;
		place-items: center;
		overflow: hidden;
		flex-shrink: 0;
	}
	.user-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.user-initials {
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 700;
		color: var(--color-accent);
	}
	.user-info {
		min-width: 0;
		flex: 1;
	}
	.user-name {
		font-size: 14px;
		font-weight: 600;
		letter-spacing: -0.01em;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.user-email {
		font-size: 12px;
		color: var(--color-text-subtle);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		margin-top: 1px;
	}

	/* :global so consumers' `extras` snippets can use class="menu-row" */
	:global(.menu-row) {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 10px 12px;
		font: inherit;
		font-size: 13.5px;
		color: var(--color-text-primary);
		background: transparent;
		border: none;
		text-align: left;
		text-decoration: none;
		border-radius: 8px;
		cursor: pointer;
	}
	:global(.menu-row:hover) {
		background: var(--color-bg-1);
	}
	:global(.menu-row.danger) {
		color: var(--err, #dc2626);
	}
	:global(.menu-row.danger:hover) {
		background: color-mix(in oklab, var(--err, #dc2626) 8%, var(--color-bg-1));
	}

	.signout-form {
		margin: 0;
	}
</style>
