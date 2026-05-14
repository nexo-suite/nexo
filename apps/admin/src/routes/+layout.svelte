<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { userMessage } from '@nexo/errors';
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { i18n } from '$lib/i18n';

	let { children } = $props();

	const isServiceDetail = $derived(
		page.url.pathname.startsWith('/services/') &&
			page.url.pathname !== '/services' &&
			page.url.pathname !== '/services/'
	);

	const rawName = $derived((page.params as Record<string, string>).name ?? '');
	const displayTitle = $derived(
		isServiceDetail
			? rawName
					.replace(/^nexo-/, '')
					.replace(/-\d+$/, '')
					.replace(/_/g, ' ')
			: 'Nexo Admin'
	);

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

	let copied = $state(false);
	async function copyId() {
		if (!errorId) return;
		await navigator.clipboard.writeText(errorId);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<ParaglideJS {i18n}>
	<div class="shell">
		<!-- Topbar -->
		<header class="topbar">
			{#if isServiceDetail}
				<a href="/services" class="topbar-action" aria-label="Back">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
						><path d="M15 6l-6 6 6 6" stroke-linecap="round" stroke-linejoin="round" /></svg
					>
				</a>
			{:else}
				<div class="brand-mark" style="margin-left:14px"></div>
			{/if}
			<div class="topbar-center">
				<span class="topbar-title">{displayTitle}</span>
			</div>
			<div class="topbar-right">
				<button
					type="button"
					class="topbar-action"
					onclick={() => window.location.reload()}
					title="Refresh"
				>
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"
						><path d="M3 8a5 5 0 018-3.5M13 8a5 5 0 01-8 3.5" /><path
							d="M11 2v3h-3M5 14v-3h3"
							stroke-linecap="round"
						/></svg
					>
				</button>
			</div>
		</header>

		<!-- Main content -->
		<main class="app-body">
			{#if errorMsg}
				<div class="error-toast" role="alert">
					<div class="error-toast-body">
						<p class="error-toast-title">{errorMsg}</p>
						{#if errorId}
							<p class="error-toast-sub">
								Ref: <code class="error-id">{errorId}</code>
							</p>
						{/if}
					</div>
					{#if errorId}
						<button type="button" class="error-toast-copy" onclick={copyId}>
							{copied ? 'Copied!' : 'Copy'}
						</button>
					{/if}
				</div>
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
				<span>Containers</span>
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
				<span>Users</span>
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
				<span>Settings</span>
			</a>
		</nav>
	</div>
</ParaglideJS>

<style>
	.shell {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		max-width: 480px;
		margin: 0 auto;
		position: relative;
		background: var(--color-bg-1);
	}

	/* ── Topbar ── */
	.topbar {
		position: fixed;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		max-width: 480px;
		z-index: 50;
		height: calc(var(--topbar-h) + var(--safe-top));
		padding: var(--safe-top) 12px 0;
		display: flex;
		align-items: center;
		gap: 4px;
		background: color-mix(in oklab, var(--color-bg-1) 82%, transparent);
		backdrop-filter: blur(14px) saturate(140%);
		-webkit-backdrop-filter: blur(14px) saturate(140%);
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.topbar-center {
		position: absolute;
		left: 50%;
		top: var(--safe-top);
		transform: translateX(-50%);
		height: var(--topbar-h);
		display: flex;
		align-items: center;
		pointer-events: none;
	}

	.topbar-title {
		font-weight: 600;
		font-size: 16px;
		letter-spacing: -0.015em;
		text-transform: capitalize;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 180px;
	}

	.topbar-action {
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		border-radius: 10px;
		color: var(--color-text-primary);
		background: transparent;
		border: 0;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: background var(--duration-fast) var(--ease-out);
		flex-shrink: 0;
	}

	.topbar-action:hover,
	.topbar-action:active {
		background: var(--color-border-subtle);
	}

	.topbar-action svg {
		width: 22px;
		height: 22px;
	}

	.topbar-right {
		margin-left: auto;
		display: flex;
		gap: 2px;
	}

	.brand-mark {
		width: 22px;
		height: 22px;
		border-radius: 6px;
		background: linear-gradient(
			135deg,
			var(--color-accent),
			color-mix(in oklab, var(--color-accent) 50%, #000)
		);
		box-shadow:
			0 0 0 1px var(--color-border-default),
			0 4px 12px var(--accent-glow);
		position: relative;
		flex-shrink: 0;
	}

	.brand-mark::after {
		content: '';
		position: absolute;
		inset: 4px;
		border-radius: 3px;
		background: linear-gradient(135deg, rgba(255, 255, 255, 0.25), transparent 60%);
	}

	/* ── App body ── */
	.app-body {
		flex: 1;
		padding-top: calc(var(--topbar-h) + var(--safe-top));
		padding-bottom: calc(var(--tabbar-h) + var(--safe-bot));
		overflow-y: auto;
		overscroll-behavior-y: contain;
	}

	/* ── Error toast ── */
	.error-toast {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 12px 16px 0;
		padding: 12px 14px;
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
		margin: 0;
	}

	.error-toast-sub {
		margin: 2px 0 0;
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
</style>
