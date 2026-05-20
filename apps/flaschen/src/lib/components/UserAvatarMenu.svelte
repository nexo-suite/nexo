<script lang="ts">
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { LogOut, Sparkles, ExternalLink } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	const user = $derived(
		page.data.user as { name?: string | null; email?: string | null; image?: string | null } | null
	);

	const displayName = $derived(user?.name?.trim() || user?.email?.split('@')[0] || 'You');

	const initials = $derived(
		displayName
			.split(/\s+/)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() ?? '')
			.join('') || 'Y'
	);

	const hubUrl = env.PUBLIC_LANDING_URL
		? `${env.PUBLIC_LANDING_URL}/apps`
		: 'https://krieger2501.de/apps';

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

	function replayTour() {
		open = false;
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('flaschen:replay-onboarding'));
		}
	}
</script>

<svelte:window onclick={handleDocClick} onkeydown={handleKey} />

<div class="wrap" bind:this={wrapperEl}>
	<button
		type="button"
		class="trigger"
		onclick={() => (open = !open)}
		aria-label={m.chrome_account()}
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

			<button type="button" class="menu-row" onclick={replayTour} role="menuitem">
				<Sparkles size={15} strokeWidth={1.7} />
				<span>{m.chrome_replay_tour()}</span>
			</button>
			<a
				class="menu-row"
				href={hubUrl}
				target="_blank"
				rel="noopener noreferrer"
				role="menuitem"
				onclick={() => (open = false)}
			>
				<ExternalLink size={15} strokeWidth={1.7} />
				<span>{m.chrome_app_hub()}</span>
			</a>

			<form method="POST" action="/auth/sign-out" class="signout-form">
				<button type="submit" class="menu-row danger" role="menuitem">
					<LogOut size={15} strokeWidth={1.7} />
					<span>{m.chrome_sign_out()}</span>
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
		background: var(--color-bg-2);
		border: 1px solid var(--color-border-default);
		cursor: pointer;
		overflow: hidden;
		padding: 0;
		flex-shrink: 0;
	}
	.trigger:active {
		opacity: 0.85;
	}
	.trigger img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.trigger-initials {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.02em;
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

	.menu-row {
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
	.menu-row:hover {
		background: var(--color-bg-1);
	}
	.menu-row.danger {
		color: var(--err);
	}
	.menu-row.danger:hover {
		background: color-mix(in oklab, var(--err) 8%, var(--color-bg-1));
	}

	.signout-form {
		margin: 0;
	}
</style>
