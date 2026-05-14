<script lang="ts">
	import { createAuthClient } from 'better-auth/svelte';
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages';

	const authClient = createAuthClient();

	let errorMsg = $state<string | null>(
		(() => {
			const e = page.url.searchParams.get('error');
			if (!e) return null;
			if (e === 'not_authorized') return m.login_error_not_authorized();
			if (e === 'server_error') return m.login_error_server();
			return m.login_error_generic();
		})()
	);
	const errorId = $derived(
		errorMsg && page.url.searchParams.get('error') === 'server_error'
			? (page.url.searchParams.get('id') ?? null)
			: null
	);
	let copied = $state(false);
	async function copyId() {
		if (!errorId) return;
		await navigator.clipboard.writeText(errorId);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
	let loading = $state<string | null>(null);

	async function signIn(provider: 'google' | 'github' | 'discord') {
		const params = page.url.searchParams;
		const callbackURL = params.get('redirectTo') ?? '/';
		console.info('[auth] signIn', provider, 'callbackURL:', callbackURL);
		const isOidcRequest = params.has('client_id') && params.has('sig');
		errorMsg = null;
		loading = provider;
		try {
			await authClient.signIn.social({
				provider,
				callbackURL,
				...(isOidcRequest && { oauth_query: page.url.search.slice(1) })
			});
		} catch {
			errorMsg = m.login_error_unknown();
			loading = null;
		}
	}
</script>

<svelte:head>
	<title>{m.login_title()}</title>
</svelte:head>

<main class="login-root">
	<div class="login-card">
		<div class="brand">
			<img src="/favicon.svg" alt="Nexo" class="brand-mark" />
			<span class="brand-name">Nexo</span>
		</div>

		<h1 class="heading">{m.login_heading()}</h1>
		<p class="sub">{m.login_sub()}</p>

		{#if errorMsg}
			<div class="error-banner" role="alert">
				<p>{errorMsg}</p>
				{#if errorId}
					<p class="error-id-row">
						{m.login_error_copy_hint()}
						<code class="error-id">{errorId}</code>
						<button type="button" class="copy-btn" onclick={copyId}>
							{copied ? m.login_copied() : m.login_copy()}
						</button>
					</p>
				{/if}
			</div>
		{/if}

		<div class="providers">
			<button
				type="button"
				class="provider-btn"
				disabled={Boolean(loading)}
				onclick={() => signIn('google')}
			>
				<svg class="provider-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
						fill="#4285F4"
					/>
					<path
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						fill="#34A853"
					/>
					<path
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
						fill="#FBBC05"
					/>
					<path
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						fill="#EA4335"
					/>
				</svg>
				{m.login_continue_google()}
			</button>

			<button
				type="button"
				class="provider-btn"
				disabled={Boolean(loading)}
				onclick={() => signIn('github')}
			>
				<svg
					class="provider-icon"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
					fill="currentColor"
				>
					<path
						d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
					/>
				</svg>
				{m.login_continue_github()}
			</button>

			<button
				type="button"
				class="provider-btn"
				disabled={Boolean(loading)}
				onclick={() => signIn('discord')}
			>
				<svg
					class="provider-icon"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
					style="fill:#5865F2"
				>
					<path
						d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"
					/>
				</svg>
				{m.login_continue_discord()}
			</button>
		</div>

		<p class="footer-note">{m.login_footer()}</p>
	</div>
</main>

<style>
	.login-root {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px 16px;
		background:
			radial-gradient(
				ellipse 60% 40% at 50% 0%,
				color-mix(in oklab, var(--color-accent) 8%, transparent),
				transparent 65%
			),
			var(--color-bg-0);
	}

	.login-card {
		width: 100%;
		max-width: 360px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		padding: 36px 32px 28px;
		box-shadow: 0 8px 40px -12px rgb(0 0 0 / 0.08);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 28px;
	}

	.brand-mark {
		display: block;
		width: 24px;
		height: 24px;
	}

	.brand-name {
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--color-text-primary);
	}

	.heading {
		font-size: 20px;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--color-text-primary);
		margin: 0 0 6px;
	}

	.sub {
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0 0 24px;
		line-height: 1.5;
	}

	.error-banner {
		margin: 0 0 16px;
		padding: 10px 14px;
		border-radius: var(--radius-md);
		border: 1px solid color-mix(in oklab, #ef4444 30%, transparent);
		background: color-mix(in oklab, #ef4444 8%, transparent);
		color: #ef4444;
		font-size: 13px;
		line-height: 1.5;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.error-id-row {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: color-mix(in oklab, #ef4444 70%, currentColor);
		flex-wrap: wrap;
	}

	.error-id {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		background: color-mix(in oklab, #ef4444 12%, transparent);
		border-radius: var(--radius-sm, 4px);
		padding: 1px 5px;
	}

	.copy-btn {
		font-size: 11px;
		font-weight: 600;
		font-family: var(--font-mono);
		padding: 2px 8px;
		border-radius: var(--radius-sm, 4px);
		border: 1px solid color-mix(in oklab, #ef4444 30%, transparent);
		background: color-mix(in oklab, #ef4444 10%, transparent);
		color: #ef4444;
		cursor: pointer;
		transition: background var(--duration-fast, 120ms) ease-out;
	}

	.copy-btn:hover {
		background: color-mix(in oklab, #ef4444 18%, transparent);
	}

	.providers {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.provider-btn {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 11px 14px;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-0);
		color: var(--color-text-primary);
		font-size: 14px;
		font-weight: 500;
		font-family: inherit;
		text-decoration: none;
		cursor: pointer;
		width: 100%;
		transition:
			background var(--duration-fast) var(--ease-out),
			border-color var(--duration-fast) var(--ease-out),
			transform var(--duration-fast) var(--ease-out);
	}
	.provider-btn:hover {
		background: var(--color-bg-1);
		border-color: var(--color-border-strong);
		transform: translateY(-1px);
	}
	.provider-btn:active {
		transform: translateY(0);
	}

	.provider-icon {
		width: 16px;
		height: 16px;
		flex-shrink: 0;
	}

	.footer-note {
		margin: 20px 0 0;
		font-size: 12px;
		color: var(--color-text-faint);
		text-align: center;
		line-height: 1.5;
	}
</style>
