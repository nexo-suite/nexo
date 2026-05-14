<script lang="ts">
	import '../app.css';
	import { page, navigating } from '$app/state';
	import { userMessage } from '@nexo/errors';
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { i18n } from '$lib/i18n';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';
	import UpdatePrompt from '$lib/components/layout/UpdatePrompt.svelte';

	let { children } = $props();

	const isLoginPage = $derived(page.url.pathname === '/login');

	type ActionForm = { error?: string; correlationId?: string } | null;
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
	{#if navigating.to}
		<div class="nav-progress"></div>
	{/if}
	<main
		class="mx-auto min-h-screen max-w-md"
		style="padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))"
	>
		{#if errorMsg}
			<div
				class="mx-4 mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm dark:border-red-900/40 dark:bg-red-950/30"
				role="alert"
			>
				<div class="min-w-0 flex-1">
					<p class="font-medium text-red-700 dark:text-red-400">{errorMsg}</p>
					{#if errorId}
						<p class="mt-0.5 text-red-600/80 dark:text-red-400/70">
							Ref:
							<code
								class="ml-1 rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs tracking-wider dark:bg-red-900/50"
								>{errorId}</code
							>
						</p>
					{/if}
				</div>
				{#if errorId}
					<button
						type="button"
						onclick={copyId}
						class="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/40"
					>
						{copied ? 'Copied!' : 'Copy'}
					</button>
				{/if}
			</div>
		{/if}
		{@render children()}
	</main>

	{#if !isLoginPage}
		<BottomNav />
	{/if}
	<UpdatePrompt />
</ParaglideJS>

<style>
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
