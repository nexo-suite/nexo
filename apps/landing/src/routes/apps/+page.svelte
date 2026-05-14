<script lang="ts">
	import { env } from '$env/dynamic/public';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	type AppTile = {
		id: string;
		name: string;
		icon: string;
		desc: string;
		href: string;
		available: boolean;
	};

	const allApps: AppTile[] = $derived([
		{
			id: 'finance',
			name: 'Finance',
			icon: '/icon-finance.svg',
			desc: 'Accounts, expenses, cashflow — your money in one place.',
			href: env.PUBLIC_FINANCE_URL ?? '#',
			available: data.allowedApps.includes('finance')
		},
		{
			id: 'admin',
			name: 'Admin',
			icon: '/favicon.svg',
			desc: 'Services, users, logs — the control room.',
			href: env.PUBLIC_ADMIN_URL ?? '#',
			available: data.allowedApps.includes('admin')
		},
		{
			id: 'gym',
			name: 'Gym',
			icon: '/icon-gym.svg',
			desc: 'Lifts, supersets, PRs. Coming soon.',
			href: '#',
			available: false
		},
		{
			id: 'pomodoro',
			name: 'Pomodoro',
			icon: '/favicon.svg',
			desc: '25 on, 5 off. Someday.',
			href: '#',
			available: false
		}
	]);

	const myApps = $derived(allApps.filter((a) => a.available));
	const comingSoon = $derived(allApps.filter((a) => !a.available));
</script>

<svelte:head>
	<title>Your apps — Nexo</title>
</svelte:head>

<main class="apps-root">
	<div class="apps-container">
		<header class="apps-header">
			<div class="avatar">
				{#if data.user.image}
					<img src={data.user.image} alt={data.user.name} class="avatar-img" />
				{:else}
					<span class="avatar-fallback">{data.user.name.charAt(0)}</span>
				{/if}
			</div>
			<div>
				<h1 class="greeting">Hey, {data.user.name.split(' ')[0]}</h1>
				<p class="sub">Here's what's yours.</p>
			</div>
		</header>

		{#if myApps.length > 0}
			<section class="tile-section">
				<div class="tile-grid">
					{#each myApps as app (app.id)}
						<a href={app.href} class="tile">
							<div class="tile-icon">
								<img src={app.icon} alt={app.name} />
							</div>
							<div class="tile-body">
								<h2 class="tile-name">{app.name}</h2>
								<p class="tile-desc">{app.desc}</p>
							</div>
							<svg
								class="tile-arrow"
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
							>
								<path d="M3 8h10M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</a>
					{/each}
				</div>
			</section>
		{:else}
			<div class="empty-state">
				<p>No apps unlocked yet. Ask Kevin to hook you up.</p>
			</div>
		{/if}

		{#if comingSoon.length > 0}
			<section class="tile-section">
				<h3 class="section-label">Coming soon</h3>
				<div class="tile-grid">
					{#each comingSoon as app (app.id)}
						<div class="tile tile--locked">
							<div class="tile-icon tile-icon--locked">
								<img src={app.icon} alt={app.name} />
							</div>
							<div class="tile-body">
								<h2 class="tile-name">{app.name}</h2>
								<p class="tile-desc">{app.desc}</p>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<a href="/" class="back-link">← Back to home</a>
	</div>
</main>

<style>
	.apps-root {
		min-height: 100dvh;
		padding: 24px 16px;
		background: var(--color-bg-0);
	}

	.apps-container {
		max-width: 480px;
		margin: 0 auto;
	}

	.apps-header {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 32px;
		padding-top: 12px;
	}

	.avatar {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		overflow: hidden;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-fallback {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.greeting {
		font-size: 20px;
		font-weight: 600;
		letter-spacing: -0.02em;
		margin: 0;
	}

	.sub {
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 2px 0 0;
	}

	.tile-section {
		margin-bottom: 28px;
	}

	.section-label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-faint);
		margin: 0 0 10px 2px;
		font-family: var(--font-mono);
	}

	.tile-grid {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.tile {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 16px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-decoration: none;
		color: inherit;
		transition:
			transform var(--duration-fast) var(--ease-out),
			border-color var(--duration-fast) var(--ease-out),
			box-shadow var(--duration-fast) var(--ease-out);
	}

	.tile:hover {
		transform: translateY(-1px);
		border-color: color-mix(in oklab, var(--color-accent) 30%, var(--color-border-default));
		box-shadow: 0 4px 16px -4px color-mix(in oklab, var(--color-accent) 10%, transparent);
	}

	.tile--locked {
		opacity: 0.5;
		cursor: default;
	}

	.tile--locked:hover {
		transform: none;
		border-color: var(--color-border-default);
		box-shadow: none;
	}

	.tile-icon {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-md);
		overflow: hidden;
		flex-shrink: 0;
		border: 1px solid var(--color-border-default);
	}

	.tile-icon img {
		width: 100%;
		height: 100%;
		display: block;
	}

	.tile-icon--locked {
		filter: grayscale(1);
	}

	.tile-body {
		flex: 1;
		min-width: 0;
	}

	.tile-name {
		font-size: 15px;
		font-weight: 600;
		margin: 0;
		letter-spacing: -0.01em;
	}

	.tile-desc {
		font-size: 12px;
		color: var(--color-text-muted);
		margin: 2px 0 0;
		line-height: 1.4;
	}

	.tile-arrow {
		width: 16px;
		height: 16px;
		color: var(--color-text-faint);
		flex-shrink: 0;
		transition: transform var(--duration-fast) var(--ease-out);
	}

	.tile:hover .tile-arrow {
		transform: translateX(2px);
		color: var(--color-accent);
	}

	.empty-state {
		padding: 32px 16px;
		text-align: center;
		color: var(--color-text-muted);
		font-size: 14px;
	}

	.back-link {
		display: inline-block;
		margin-top: 8px;
		font-size: 13px;
		color: var(--color-text-subtle);
		text-decoration: none;
		transition: color var(--duration-fast) var(--ease-out);
	}

	.back-link:hover {
		color: var(--color-text-primary);
	}
</style>
