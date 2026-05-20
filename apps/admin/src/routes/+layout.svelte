<script lang="ts">
	import '../app.css';
	import { page, navigating } from '$app/state';
	import { userMessage } from '@nexo/errors';
	import { ErrorBanner, UpdatePrompt } from '@nexo/ui';
	import KonamiCode from '$lib/components/KonamiCode.svelte';
	import { m } from '$lib/paraglide/messages.js';

	let { children } = $props();

	const activeTab = $derived(
		page.url.pathname.startsWith('/users')
			? 'users'
			: page.url.pathname.startsWith('/settings')
				? 'settings'
				: 'containers'
	);

	type ActionForm = { correlationId?: string; error?: string } | null;
	const formResult = $derived(page.form as ActionForm);
	const errorCode = $derived(formResult?.error ?? null);
	const errorMsg = $derived(errorCode ? userMessage(errorCode) : null);
	const errorId = $derived(formResult?.correlationId ?? null);
	const errorKey = $derived(errorId ?? errorCode ?? '');

	let dismissedFor = $state<string | null>(null);
	const showError = $derived(Boolean(errorMsg) && dismissedFor !== errorKey);
</script>

{#if navigating.to}
	<div class="nav-progress"></div>
{/if}
<svelte:head>
	<title>Admin — Nexo</title>
</svelte:head>
<div class="shell">
	<!-- Main content -->
	<main class="app-body">
		{#if showError && errorMsg}
			<ErrorBanner
				message={errorMsg}
				correlationId={errorId ?? undefined}
				onDismiss={() => (dismissedFor = errorKey)}
			/>
		{/if}
		{@render children()}
	</main>

	<!-- Bottom tab bar -->
	<nav class="tabbar">
		<a href="/services" class="tab" class:active={activeTab === 'containers'}>
			<div class="tab-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
					><path d="M12 3l8 4v10l-8 4-8-4V7z" /><path d="M4 7l8 4 8-4M12 11v10" /></svg
				>
			</div>
			<span>{m.nav_containers()}</span>
		</a>
		<a href="/users" class="tab" class:active={activeTab === 'users'}>
			<div class="tab-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
					><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" /><circle
						cx="17"
						cy="9"
						r="2.5"
					/><path d="M15 14.5c2.5 0 4 1.5 4 4" /></svg
				>
			</div>
			<span>{m.nav_users()}</span>
		</a>
		<a href="/settings" class="tab" class:active={activeTab === 'settings'}>
			<div class="tab-icon">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
					><circle cx="12" cy="12" r="3" /><path
						d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
						stroke-linecap="round"
					/></svg
				>
			</div>
			<span>{m.nav_settings()}</span>
		</a>
	</nav>
</div>
<UpdatePrompt bottomOffset={68} />
<KonamiCode />

<style>
	.shell {
		height: 100dvh;
		display: flex;
		flex-direction: column;
		max-width: 480px;
		margin: 0 auto;
		position: relative;
		background: var(--color-bg-1);
		overflow: hidden;
	}

	/* ── App body ── */
	.app-body {
		flex: 1;
		padding-top: var(--safe-top);
		padding-bottom: calc(var(--tabbar-h) + var(--safe-bot));
		overflow-y: auto;
		overscroll-behavior-y: contain;
	}

	/* ── Bottom tab bar ── */
	.tabbar {
		position: fixed;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		max-width: 480px;
		z-index: 50;
		height: calc(var(--tabbar-h) + var(--safe-bot));
		padding-bottom: var(--safe-bot);
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		background: color-mix(in oklab, var(--color-surface-1) 90%, transparent);
		backdrop-filter: blur(20px) saturate(140%);
		-webkit-backdrop-filter: blur(20px) saturate(140%);
		border-top: 1px solid var(--color-border-subtle);
	}

	.tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 3px;
		color: var(--color-text-subtle);
		cursor: pointer;
		background: transparent;
		border: 0;
		font-size: 10px;
		font-weight: 500;
		letter-spacing: 0.02em;
		-webkit-tap-highlight-color: transparent;
		transition: color var(--duration-fast) var(--ease-out);
		padding: 0 4px;
	}

	.tab.active {
		color: var(--accent-ink);
	}

	.tab-icon {
		width: 40px;
		height: 28px;
		border-radius: 14px;
		display: grid;
		place-items: center;
		transition: background var(--duration-base) var(--ease-out);
	}

	.tab.active .tab-icon {
		background: color-mix(in oklab, var(--color-accent) 12%, transparent);
	}

	.tab svg {
		width: 22px;
		height: 22px;
	}

	.nav-progress {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 2px;
		z-index: 100;
		background: var(--color-accent);
		animation: progress 1.5s ease-in-out infinite;
	}

	@keyframes progress {
		0% {
			transform: scaleX(0);
			transform-origin: left;
		}
		50% {
			transform: scaleX(0.7);
			transform-origin: left;
		}
		51% {
			transform-origin: right;
		}
		100% {
			transform: scaleX(0);
			transform-origin: right;
		}
	}
</style>
