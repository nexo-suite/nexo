<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let submitting = $state<'accept' | 'deny' | null>(null);

	async function decide(accept: boolean) {
		submitting = accept ? 'accept' : 'deny';
		try {
			const res = await fetch('/api/auth/oauth2/consent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ accept }),
				credentials: 'include'
			});
			if (res.ok) {
				const { redirectURI } = await res.json().catch(() => ({}));
				if (redirectURI) {
					window.location.href = redirectURI;
					return;
				}
			}
			window.location.href = '/';
		} finally {
			submitting = null;
		}
	}
</script>

<svelte:head>
	<title>Authorize {data.clientName} — Nexo</title>
</svelte:head>

<main class="login-root">
	<div class="login-card">
		<div class="brand">
			<span class="brand-mark"></span>
			<span class="brand-name">Nexo</span>
		</div>
		<h1 class="title">Authorize {data.clientName}</h1>
		<p class="sub">
			<strong>{data.clientName}</strong> is requesting access to your account.
		</p>

		{#if data.scopes.length > 0}
			<p class="sub">It will be able to:</p>
			<ul class="scopes">
				{#each data.scopes as scope (scope)}
					<li>{scope}</li>
				{/each}
			</ul>
		{/if}

		<div class="actions">
			<button
				type="button"
				class="btn-deny"
				disabled={submitting !== null}
				onclick={() => decide(false)}
			>
				{submitting === 'deny' ? 'Denying…' : 'Deny'}
			</button>
			<button
				type="button"
				class="btn-accept"
				disabled={submitting !== null}
				onclick={() => decide(true)}
			>
				{submitting === 'accept' ? 'Approving…' : 'Approve'}
			</button>
		</div>
	</div>
</main>

<style>
	.login-root {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px 16px;
		background: var(--color-bg-0);
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
		margin-bottom: 20px;
	}
	.brand-mark {
		display: block;
		width: 22px;
		height: 22px;
		border-radius: 6px;
		background: linear-gradient(
			135deg,
			var(--color-accent),
			color-mix(in oklab, var(--color-accent) 50%, #000)
		);
		position: relative;
	}
	.brand-mark::after {
		content: '';
		position: absolute;
		inset: 4px;
		border-radius: 3px;
		background: linear-gradient(135deg, rgb(255 255 255 / 0.24), transparent 60%);
	}
	.brand-name {
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--color-text-primary);
	}
	.title {
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 12px;
		color: var(--color-text-primary);
	}
	.sub {
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0 0 12px;
	}
	.scopes {
		font-size: 13px;
		color: var(--color-text-primary);
		margin: 0 0 20px;
		padding-left: 18px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.actions {
		display: flex;
		gap: 8px;
		margin-top: 20px;
	}
	.btn-accept,
	.btn-deny {
		flex: 1;
		padding: 12px;
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
	}
	.btn-accept {
		background: var(--color-accent);
		color: #fff;
	}
	.btn-deny {
		background: var(--color-surface-2, #f0f0f0);
		color: var(--color-text-primary);
	}
	.btn-accept:disabled,
	.btn-deny:disabled {
		opacity: 0.6;
		cursor: progress;
	}
</style>
