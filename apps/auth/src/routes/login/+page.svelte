<script lang="ts">
	import { createAuthClient } from 'better-auth/svelte';
	import { env } from '$env/dynamic/public';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import AuthShell from '$lib/components/AuthShell.svelte';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();
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
	const errorKind = $derived(page.url.searchParams.get('error'));
	const errorId = $derived(
		errorMsg && errorKind === 'server_error' ? (page.url.searchParams.get('id') ?? null) : null
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
		const defaultRedirect = `${env.PUBLIC_LANDING_URL ?? ''}/apps`;
		const callbackURL = params.get('redirectTo') ?? defaultRedirect;
		console.info('[auth] signIn', provider, 'callbackURL:', callbackURL);
		const isOidcRequest = params.has('client_id') && params.has('sig');
		errorMsg = null;
		loading = provider;
		try {
		const { error } = await authClient.signIn.social({
			provider,
			callbackURL,
			...(isOidcRequest && { oauth_query: page.url.search.slice(1) })
		});
		if (error) {
			errorMsg = m.login_error_unknown();
			loading = null;
		}
	} catch {
		errorMsg = m.login_error_unknown();
		loading = null;
	}
	}

	const appsUrl = 'https://krieger2501.de/apps';

	async function signOut() {
		loading = 'signout';
		await authClient.signOut({ fetchOptions: { onSuccess: () => location.reload() } });
	}

	const mood = $derived(
		data.user
			? 'returning'
			: errorKind === 'server_error'
				? 'error'
				: errorKind === 'not_authorized'
					? 'denied'
					: 'welcome'
	);
	const eyebrow = $derived(
		data.user
			? 'signed in'
			: errorKind === 'server_error'
				? 'server hiccup'
				: errorKind === 'not_authorized'
					? 'not on the list'
					: 'sign in'
	);
</script>

<svelte:head>
	<title>{m.login_title()}</title>
</svelte:head>

{#if data.user}
	<AuthShell
		{mood}
		{eyebrow}
		heading={m.login_already_heading()}
		sub={m.login_already_sub({ email: data.user.email })}
	>
		<div class="signed-in-row">
			<div class="signed-in-avatar">
				{#if data.user.image}
					<img src={data.user.image} alt={data.user.name} class="signed-in-img" />
				{:else}
					<span class="signed-in-fallback">{data.user.name.charAt(0)}</span>
				{/if}
			</div>
			<div class="signed-in-meta">
				<span class="signed-in-name">{data.user.name}</span>
				<span class="signed-in-email">{data.user.email}</span>
			</div>
		</div>

		<a href={appsUrl} class="btn btn-primary">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
				<rect x="3" y="3" width="7" height="7" rx="1" />
				<rect x="14" y="3" width="7" height="7" rx="1" />
				<rect x="3" y="14" width="7" height="7" rx="1" />
				<rect x="14" y="14" width="7" height="7" rx="1" />
			</svg>
			<span>{m.login_already_apps()}</span>
			<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" class="btn-arrow">
				<path d="M3 8h10M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</a>
		<button
			type="button"
			class="btn btn-ghost"
			disabled={loading === 'signout'}
			onclick={signOut}
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="btn-icon">
				<path
					d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<polyline points="16,17 21,12 16,7" stroke-linecap="round" stroke-linejoin="round" />
				<line x1="21" y1="12" x2="9" y2="12" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			<span>{m.login_already_signout()}</span>
		</button>
	</AuthShell>
{:else}
	<AuthShell
		{mood}
		{eyebrow}
		heading={errorKind === 'not_authorized'
			? m.not_authorized_heading()
			: m.login_heading()}
		sub={errorMsg ?? m.login_sub()}
		footer={errorMsg ? undefined : footerSnippet}
	>
		{#if errorMsg && errorId}
			<div class="ref-row">
				<span class="ref-label">Ref</span>
				<code class="ref-id">{errorId}</code>
				<button type="button" class="ref-copy" onclick={copyId}>
					{copied ? m.login_copied() : m.login_copy()}
				</button>
			</div>
		{/if}

		<button
			type="button"
			class="btn btn-provider"
			disabled={Boolean(loading)}
			data-loading={loading === 'google'}
			onclick={() => signIn('google')}
		>
			<span class="btn-icon">
				<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
			</span>
			<span class="btn-label">{m.login_continue_google()}</span>
			<span class="btn-tail" aria-hidden="true"></span>
		</button>

		<button
			type="button"
			class="btn btn-provider"
			disabled={Boolean(loading)}
			data-loading={loading === 'github'}
			onclick={() => signIn('github')}
		>
			<span class="btn-icon">
				<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
					<path
						d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
					/>
				</svg>
			</span>
			<span class="btn-label">{m.login_continue_github()}</span>
			<span class="btn-tail" aria-hidden="true"></span>
		</button>

		<button
			type="button"
			class="btn btn-provider"
			disabled={Boolean(loading)}
			data-loading={loading === 'discord'}
			onclick={() => signIn('discord')}
		>
			<span class="btn-icon">
				<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="fill:#5865F2">
					<path
						d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.043.033.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"
					/>
				</svg>
			</span>
			<span class="btn-label">{m.login_continue_discord()}</span>
			<span class="btn-tail" aria-hidden="true"></span>
		</button>
	</AuthShell>
{/if}

{#snippet footerSnippet()}
	{m.login_footer()}
{/snippet}

<style>
	/* ─── Buttons (match Nexo system: subtle border, soft hover, clean) ─── */
	.btn {
		position: relative;
		display: grid;
		grid-template-columns: 18px 1fr 14px;
		align-items: center;
		gap: 12px;
		padding: 11px 14px;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-0);
		color: var(--color-text-primary);
		font-family: inherit;
		font-size: 14px;
		font-weight: 500;
		text-decoration: none;
		cursor: pointer;
		text-align: left;
		transition:
			background var(--duration-fast) var(--ease-out),
			border-color var(--duration-fast) var(--ease-out),
			transform var(--duration-fast) var(--ease-out);
	}

	.btn:hover:not(:disabled) {
		background: var(--color-bg-1);
		border-color: var(--color-border-strong);
		transform: translateY(-1px);
	}
	.btn:active:not(:disabled) {
		transform: translateY(0);
	}
	.btn:disabled {
		opacity: 0.55;
		cursor: wait;
	}

	.btn-icon {
		display: grid;
		place-items: center;
		width: 18px;
		height: 18px;
	}
	.btn-icon :global(svg) {
		width: 18px;
		height: 18px;
	}
	.btn-arrow {
		width: 14px;
		height: 14px;
		transition: transform var(--duration-fast) var(--ease-out);
	}

	.btn-label {
		min-width: 0;
	}

	.btn-tail {
		width: 14px;
		height: 14px;
	}

	/* Provider button — green dot appears on hover, replaced by a spinner while signing in */
	.btn-provider .btn-tail {
		position: relative;
	}
	.btn-provider .btn-tail::before {
		content: '';
		position: absolute;
		inset: 0;
		margin: auto;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--color-accent);
		opacity: 0;
		transition: opacity var(--duration-fast) var(--ease-out);
	}
	.btn-provider:hover:not(:disabled) .btn-tail::before {
		opacity: 1;
	}
	.btn-provider[data-loading='true'] {
		border-color: color-mix(in oklab, var(--color-accent) 50%, var(--color-border-strong));
		background: color-mix(in oklab, var(--color-accent) 5%, var(--color-bg-0));
	}
	.btn-provider[data-loading='true'] .btn-tail {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1.5px solid color-mix(in oklab, var(--color-accent) 30%, transparent);
		border-top-color: var(--color-accent);
		animation: spin 700ms linear infinite;
	}
	.btn-provider[data-loading='true'] .btn-tail::before {
		display: none;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Primary CTA on signed-in state */
	.btn-primary {
		background: var(--color-text-primary);
		border-color: var(--color-text-primary);
		color: var(--color-bg-0);
	}
	.btn-primary:hover:not(:disabled) {
		background: color-mix(in oklab, var(--color-text-primary) 88%, var(--color-accent));
		border-color: color-mix(in oklab, var(--color-text-primary) 88%, var(--color-accent));
		transform: translateY(-1px);
	}
	.btn-primary .btn-arrow {
		justify-self: end;
	}
	.btn-primary:hover:not(:disabled) .btn-arrow {
		transform: translateX(2px);
	}

	.btn-ghost {
		background: transparent;
		border-color: transparent;
		color: var(--color-text-muted);
	}
	.btn-ghost:hover:not(:disabled) {
		background: var(--color-bg-1);
		border-color: var(--color-border-default);
		color: var(--color-text-primary);
	}

	/* ─── Server-error correlation-id row (matches @nexo/ui ErrorBanner vocabulary) ─── */
	.ref-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		margin-bottom: 4px;
		border-radius: var(--radius-md);
		border: 1px solid color-mix(in oklab, #ef4444 28%, transparent);
		background: color-mix(in oklab, #ef4444 6%, transparent);
		font-size: 12px;
		flex-wrap: wrap;
	}
	.ref-label {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #ef4444;
	}
	.ref-id {
		flex: 1;
		min-width: 0;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.04em;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		background: color-mix(in oklab, #ef4444 10%, transparent);
		color: color-mix(in oklab, #ef4444 80%, var(--color-text-primary));
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ref-copy {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 4px 9px;
		border-radius: var(--radius-sm);
		border: 1px solid color-mix(in oklab, #ef4444 30%, transparent);
		background: color-mix(in oklab, #ef4444 10%, transparent);
		color: #ef4444;
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-out);
	}
	.ref-copy:hover {
		background: color-mix(in oklab, #ef4444 18%, transparent);
	}

	/* ─── Signed-in identity row ─── */
	.signed-in-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		margin-bottom: 4px;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		background: var(--color-bg-0);
	}
	.signed-in-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		overflow: hidden;
		background: var(--color-bg-1);
		flex-shrink: 0;
	}
	.signed-in-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.signed-in-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-text-muted);
	}
	.signed-in-meta {
		display: flex;
		flex-direction: column;
		min-width: 0;
		gap: 2px;
	}
	.signed-in-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.signed-in-email {
		font-size: 11px;
		color: var(--color-text-faint);
		font-family: var(--font-mono);
		letter-spacing: 0.02em;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
