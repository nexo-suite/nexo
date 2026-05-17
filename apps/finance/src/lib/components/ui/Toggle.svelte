<script lang="ts">
	let {
		checked = $bindable(false),
		label,
		description,
		id
	}: {
		checked: boolean;
		label: string;
		description?: string;
		id?: string;
	} = $props();
</script>

<div class="bg-bg-1 flex items-center justify-between rounded-[var(--radius-md)] p-3.5">
	<label for={id} class="cursor-pointer">
		<div class="text-[14.5px] font-medium">{label}</div>
		{#if description}
			<div class="text-text-subtle mt-0.5 text-[12px]">{description}</div>
		{/if}
	</label>
	<button
		type="button"
		role="switch"
		{id}
		aria-checked={checked}
		aria-label={label}
		onclick={() => (checked = !checked)}
		class="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors"
		style="background-color: {checked
			? 'var(--color-accent)'
			: 'var(--color-bg-2)'}; transition-duration: var(--dur-fast); transition-timing-function: var(--ease-out);"
	>
		<span
			class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-[left,right]"
			style="transition-duration: var(--dur-fast); transition-timing-function: var(--ease-out);
			       {checked ? 'right: 3px; left: auto;' : 'left: 3px; right: auto;'}"
		></span>
	</button>
</div>
