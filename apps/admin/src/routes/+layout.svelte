<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { Users } from 'lucide-svelte';

	let { data, children } = $props();

	const navItems = [{ href: '/users', label: 'Users', icon: Users }];

	const isActive = (href: string) => page.url.pathname.startsWith(href);
</script>

<div class="admin-shell">
	<aside class="sidebar">
		<div class="sidebar-brand">
			<span class="brand-mark"></span>
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
		<div class="bottom-user">
			<div class="user-avatar-sm">
				{data.user?.name?.[0]?.toUpperCase() ?? '?'}
			</div>
		</div>
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
		width: 20px;
		height: 20px;
		border-radius: 5px;
		background: linear-gradient(
			135deg,
			var(--color-accent),
			color-mix(in oklab, var(--color-accent) 50%, #000)
		);
		box-shadow: 0 2px 6px color-mix(in oklab, var(--color-accent) 25%, transparent);
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

	/* Bottom tab bar — hidden on desktop */
	.bottom-bar {
		display: none;
	}

	.user-avatar-sm {
		width: 28px;
		height: 28px;
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

	.bottom-user {
		display: flex;
		align-items: center;
		padding: 0 4px;
	}

	@media (max-width: 640px) {
		.sidebar {
			display: none;
		}

		.main-content {
			padding: 20px 16px calc(var(--bottom-bar-height) + env(safe-area-inset-bottom) + 16px);
			overflow: visible;
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
