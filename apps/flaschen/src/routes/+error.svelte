<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import { userMessage } from '@nexo/errors';

	const status = $derived(page.status);
	const code = $derived(page.error?.message);
	const friendly = $derived(code ? userMessage(code) : null);
</script>

<div class="error-page">
	<div class="error-code">{status}</div>
	<div class="error-message">{friendly ?? code ?? 'Something went wrong.'}</div>
	<a href="/" class="error-link">{m.nav_home()} →</a>
</div>

<style>
	.error-page {
		max-width: 360px;
		margin: 64px auto;
		text-align: center;
		padding: 0 20px;
	}
	.error-code {
		font-size: 56px;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--color-accent);
	}
	.error-message {
		font-size: 15px;
		color: var(--color-text);
		margin-top: 8px;
	}
	.error-link {
		display: inline-block;
		margin-top: 24px;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-accent);
		text-decoration: none;
	}
</style>
