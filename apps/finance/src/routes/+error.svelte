<script lang="ts">
	import { page } from '$app/state';
	import { userMessage } from '@nexo/errors';

	const code = $derived(page.error?.code ?? null);
	const msg = $derived(code ? userMessage(code) : (page.error?.message ?? 'Something went wrong'));
	const correlationId = $derived(page.error?.correlationId ?? null);

	let copied = $state(false);
	async function copyId() {
		if (!correlationId) return;
		await navigator.clipboard.writeText(correlationId);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
	<p class="text-6xl font-bold text-zinc-300 dark:text-zinc-700">{page.status}</p>
	<p class="mt-4 text-lg font-medium text-zinc-800 dark:text-zinc-200">{msg}</p>

	{#if correlationId}
		<div class="mt-4 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
			<span>Ref:</span>
			<code class="rounded bg-zinc-100 px-2 py-0.5 font-mono text-xs dark:bg-zinc-800"
				>{correlationId}</code
			>
			<button
				type="button"
				class="rounded px-2 py-0.5 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
				onclick={copyId}
			>
				{copied ? 'Copied!' : 'Copy'}
			</button>
		</div>
	{/if}

	<a
		href="/"
		class="mt-8 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
	>
		Go home
	</a>
</div>
