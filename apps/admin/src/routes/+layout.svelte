<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { Users, Server } from 'lucide-svelte';

	let { data, children } = $props();

	const navItems = [
		{ href: '/users', label: 'Users', icon: Users },
		{ href: '/services', label: 'Services', icon: Server }
	];

	const isActive = (href: string) => page.url.pathname.startsWith(href);

	type ActionForm = { correlationId?: string; error?: string; addError?: string } | null;
	const errorId = $derived((page.form as ActionForm)?.correlationId ?? null);

	let copied = $state(false);
	async function copyId() {
		if (!errorId) return;
		await navigator.clipboard.writeText(errorId);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="admin-shell">
	<aside class="sidebar">
		<div class="sidebar-brand">
			<svg
				class="brand-mark"
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 100 100"
				role="img"
				aria-label="Nexo Admin"
			>
				<rect width="100" height="100" rx="22" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" />
				<rect x="26" y="26" width="22" height="22" rx="3" fill="#16a34a" />
				<rect
					x="52"
					y="26"
					width="22"
					height="22"
					rx="3"
					fill="none"
					stroke="#18181b"
					stroke-width="3"
				/>
				<rect
					x="26"
					y="52"
					width="22"
					height="22"
					rx="3"
					fill="none"
					stroke="#18181b"
					stroke-width="3"
				/>
				<rect
					x="52"
					y="52"
					width="22"
					height="22"
					rx="3"
					fill="none"
					stroke="#18181b"
					stroke-width="3"
				/>
			</svg>
			<span class="brand-name">Nexo Admin</span>
		</div>

		<nav class="sidebar-nav">
			{#each navItems as item (item.href)}
				<a href={item.href} class="nav-link {isActive(item.href) ? 'active' : ''}">
					<item.icon size={16} />
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="sidebar-footer">
			<div class="user-pill">
				<div class="user-avatar">
					{data.user?.name?.[0]?.toUpperCase() ?? '?'}
				</div>
				<span class="user-email">{data.user?.email ?? ''}</span>
			</div>
		</div>
	</aside>

	<main class="main-content">
		{#if errorId}
			<div class="error-toast" role="alert">
				<div class="error-toast-body">
					<p class="error-toast-title">Something went wrong</p>
					<p class="error-toast-sub">
						Copy this code and show it to Kevin — he'll know what to do: <code class="error-id"
							>{errorId}</code
						>
					</p>
				</div>
				<button type="button" class="error-toast-copy" onclick={copyId}>
					{copied ? 'Copied!' : 'Copy'}
				</button>
			</div>
		{/if}
		{@render children()}
	</main>

	<!-- Mobile bottom tab bar -->
	<nav class="bottom-bar">
		{#each navItems as item (item.href)}
			<a href={item.href} class="bottom-tab {isActive(item.href) ? 'active' : ''}">
				<item.icon size={20} />
				<span class="bottom-tab-label">{item.label}</span>
			</a>
		{/each}
	</nav>
</div>

<style>
	.admin-shell {
		display: flex;
		min-height: 100dvh;
	}

	.sidebar {
		width: var(--sidebar-width);
		flex-shrink: 0;
		background: var(--color-surface-1);
		border-right: 1px solid var(--color-border-default);
		display: flex;
		flex-direction: column;
		position: sticky;
		top: 0;
		height: 100dvh;
		overflow-y: auto;
	}

	.sidebar-brand {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 20px 18px 16px;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.brand-mark {
		display: block;
		width: 22px;
		height: 22px;
		flex-shrink: 0;
	}

	.brand-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text-primary);
		letter-spacing: -0.01em;
	}

	.sidebar-nav {
		flex: 1;
		padding: 12px 10px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 7px 10px;
		border-radius: var(--radius-md);
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-muted);
		text-decoration: none;
		transition:
			background var(--duration-fast) var(--ease-out),
			color var(--duration-fast) var(--ease-out);
	}

	.nav-link:hover {
		background: var(--color-bg-1);
		color: var(--color-text-primary);
	}

	.nav-link.active {
		background: var(--color-accent-muted);
		color: var(--color-accent);
	}

	.sidebar-footer {
		padding: 12px 10px;
		border-top: 1px solid var(--color-border-subtle);
	}

	.user-pill {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 8px;
		border-radius: var(--radius-md);
	}

	.user-avatar {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: var(--color-accent-muted);
		color: var(--color-accent);
		font-size: 11px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.user-email {
		font-size: 11px;
		color: var(--color-text-faint);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.main-content {
		flex: 1;
		min-width: 0;
		padding: 32px 40px;
		overflow: hidden;
	}

	.error-toast {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 20px;
		padding: 12px 16px;
		border-radius: var(--radius-lg);
		border: 1px solid color-mix(in oklab, #ef4444 30%, transparent);
		background: color-mix(in oklab, #ef4444 6%, transparent);
	}

	.error-toast-body {
		flex: 1;
		min-width: 0;
	}

	.error-toast-title {
		font-size: 13px;
		font-weight: 600;
		color: #ef4444;
	}

	.error-toast-sub {
		margin-top: 2px;
		font-size: 12px;
		color: color-mix(in oklab, #ef4444 70%, var(--color-text-subtle));
	}

	.error-id {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		background: color-mix(in oklab, #ef4444 10%, transparent);
		border-radius: var(--radius-sm);
		padding: 1px 5px;
	}

	.error-toast-copy {
		flex-shrink: 0;
		font-size: 11px;
		font-weight: 600;
		font-family: var(--font-mono);
		padding: 4px 10px;
		border-radius: var(--radius-md);
		border: 1px solid color-mix(in oklab, #ef4444 30%, transparent);
		background: color-mix(in oklab, #ef4444 10%, transparent);
		color: #ef4444;
		cursor: pointer;
		transition:
			background var(--duration-fast) var(--ease-out),
			color var(--duration-fast) var(--ease-out);
	}

	.error-toast-copy:hover {
		background: color-mix(in oklab, #ef4444 18%, transparent);
	}

	/* Bottom tab bar — hidden on desktop */
	.bottom-bar {
		display: none;
	}

	.bottom-tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		flex: 1;
		padding: 6px 0;
		text-decoration: none;
		color: var(--color-text-subtle);
		border-radius: var(--radius-md);
		transition: color var(--duration-fast) var(--ease-out);
	}

	.bottom-tab.active {
		color: var(--color-accent);
	}

	.bottom-tab-label {
		font-size: 10px;
		font-weight: 600;
	}

	@media (max-width: 640px) {
		.admin-shell {
			height: 100dvh;
			overflow: hidden;
		}

		.sidebar {
			display: none;
		}

		.main-content {
			overflow-y: auto;
			height: 100%;
			padding: calc(env(safe-area-inset-top) + 20px) 16px
				calc(var(--bottom-bar-height) + env(safe-area-inset-bottom) + 16px);
		}

		.bottom-bar {
			display: flex;
			align-items: center;
			position: fixed;
			bottom: 0;
			left: 0;
			right: 0;
			height: calc(var(--bottom-bar-height) + env(safe-area-inset-bottom));
			background: var(--color-surface-1);
			border-top: 1px solid var(--color-border-default);
			padding: 0 12px env(safe-area-inset-bottom);
			gap: 4px;
			z-index: 40;
		}
	}
</style>
