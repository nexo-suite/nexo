<script lang="ts">
	import { Search } from '@lucide/svelte';
	import { grafanaConfigured, grafanaLogsUrl } from '$lib/utils/grafana';
	import { m } from '$lib/paraglide/messages.js';

	let value = $state('');
	const enabled = $derived(grafanaConfigured());

	function submit(e: Event) {
		e.preventDefault();
		const id = value.trim();
		if (!id || !enabled) return;
		const url = grafanaLogsUrl({ correlationId: id, fromMinutes: 60 });
		if (!url) return;
		window.open(url, '_blank', 'noopener,noreferrer');
		value = '';
	}
</script>

<form onsubmit={submit} class="search" class:disabled={!enabled}>
	<Search size={14} strokeWidth={1.8} />
	<input
		type="text"
		bind:value
		placeholder={m.correlation_search_placeholder()}
		aria-label={m.correlation_search_aria()}
		spellcheck="false"
		autocapitalize="off"
		autocomplete="off"
		disabled={!enabled}
	/>
</form>

<style>
	.search {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
		max-width: 240px;
		height: 34px;
		padding: 0 10px;
		border-radius: 999px;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-default);
		color: var(--color-text-faint);
		transition: border-color var(--duration-fast) var(--ease-out);
	}
	.search:focus-within {
		border-color: color-mix(in oklab, var(--color-accent) 40%, var(--color-border-default));
		color: var(--color-text-muted);
	}
	.search.disabled {
		opacity: 0.55;
	}
	input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: transparent;
		font: inherit;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--color-text-primary);
		outline: none;
	}
	input::placeholder {
		color: var(--color-text-faint);
	}
</style>
