<script lang="ts">
	type Tab = { id: string; label: string; count?: number };

	let {
		tabs,
		active,
		onchange
	}: {
		tabs: Tab[];
		active: string;
		onchange?: (id: string) => void;
	} = $props();
</script>

<div class="bg-bg-1 flex gap-1 rounded-[var(--radius-md)] p-1">
	{#each tabs as tab (tab.id)}
		<button
			type="button"
			onclick={() => onchange?.(tab.id)}
			class="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[7px] text-[13px] font-medium tracking-tight
			       transition-[background,color]"
			class:bg-surface-1={active === tab.id}
			class:text-text-primary={active === tab.id}
			class:shadow-sm={active === tab.id}
			class:text-text-muted={active !== tab.id}
			style="transition-duration: var(--dur-fast); transition-timing-function: var(--ease-out);"
		>
			{tab.label}
			{#if tab.count !== undefined}
				<span class="text-[11px] opacity-60">{tab.count}</span>
			{/if}
		</button>
	{/each}
</div>
