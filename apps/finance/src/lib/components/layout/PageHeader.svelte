<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { User } from 'better-auth';
	import AccountMenu from './AccountMenu.svelte';

	let {
		title,
		subtitle = '',
		actions,
		user = null,
		displayName = null
	}: {
		title: string;
		subtitle?: string;
		actions?: Snippet;
		user?: User | null;
		displayName?: string | null;
	} = $props();
</script>

<header class="mb-5 flex items-center justify-between">
	<div>
		{#if subtitle}
			<p class="text-text-subtle mb-0.5 text-[11px] font-semibold tracking-widest uppercase">
				{subtitle}
			</p>
		{/if}
		<h1 class="text-2xl font-bold tracking-tight">{title}</h1>
	</div>
	<div class="flex items-center gap-3">
		{#if actions}
			{@render actions()}
		{/if}
		{#if user}
			<AccountMenu {user} {displayName} />
		{/if}
	</div>
</header>
