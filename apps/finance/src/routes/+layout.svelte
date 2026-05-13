<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import BottomNav from '$lib/components/layout/BottomNav.svelte';

	let { children } = $props();

	const isLoginPage = $derived(page.url.pathname === '/login');

	type ActionForm = { error?: string; correlationId?: string } | null;
	const errorId = $derived((page.form as ActionForm)?.correlationId ?? null);

	let copied = $state(false);
	async function copyId() {
		if (!errorId) return;
		await navigator.clipboard.writeText(errorId);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<main
	class="mx-auto min-h-screen max-w-md"
	style="padding-bottom: calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))"
>
	{#if errorId}
		<div
			class="mx-4 mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm dark:border-red-900/40 dark:bg-red-950/30"
			role="alert"
		>
			<div class="min-w-0 flex-1">
				<p class="font-medium text-red-700 dark:text-red-400">Something went wrong</p>
				<p class="mt-0.5 text-red-600/80 dark:text-red-400/70">
					Copy this code and show it to Kevin — he'll know what to do:
					<code
						class="ml-1 rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs tracking-wider dark:bg-red-900/50"
						>{errorId}</code
					>
				</p>
			</div>
			<button
				type="button"
				onclick={copyId}
				class="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/40"
			>
				{copied ? 'Copied!' : 'Copy'}
			</button>
		</div>
	{/if}
	{@render children()}
</main>

{#if !isLoginPage}
	<BottomNav />
{/if}
