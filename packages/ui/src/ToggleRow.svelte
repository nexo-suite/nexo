<script lang="ts">
	import Toggle from './Toggle.svelte';

	let {
		checked = $bindable(false),
		label,
		description,
		id,
		onchange
	}: {
		checked?: boolean;
		label: string;
		description?: string;
		id?: string;
		onchange?: (next: boolean) => void;
	} = $props();
</script>

<div class="toggle-row">
	<label for={id} class="toggle-label">
		<div class="toggle-text">{label}</div>
		{#if description}
			<div class="toggle-desc">{description}</div>
		{/if}
	</label>
	<Toggle bind:checked ariaLabel={label} {onchange} />
</div>

<style>
	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 16px;
		background: var(--color-bg-1);
		border-radius: var(--radius-md);
	}
	.toggle-label {
		cursor: pointer;
		flex: 1;
		min-width: 0;
	}
	.toggle-text {
		font-size: 14.5px;
		font-weight: 500;
	}
	.toggle-desc {
		font-size: 12px;
		color: var(--color-text-subtle);
		margin-top: 2px;
		line-height: 1.4;
	}
</style>
