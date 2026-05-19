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

<div class="toggle-row">
	<label for={id} class="toggle-label">
		<div class="toggle-text">{label}</div>
		{#if description}
			<div class="toggle-desc">{description}</div>
		{/if}
	</label>
	<button
		type="button"
		role="switch"
		{id}
		aria-checked={checked}
		aria-label={label}
		onclick={() => (checked = !checked)}
		class="toggle-track"
		class:on={checked}
	>
		<span class="toggle-thumb" class:on={checked}></span>
	</button>
</div>

<style>
	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 16px;
		background: var(--color-surface-1);
	}
	.toggle-label {
		cursor: pointer;
		flex: 1;
	}
	.toggle-text {
		font-size: 14.5px;
		font-weight: 500;
	}
	.toggle-desc {
		font-size: 12px;
		color: var(--color-text-subtle);
		margin-top: 2px;
	}
	.toggle-track {
		position: relative;
		width: 44px;
		height: 26px;
		flex-shrink: 0;
		border: 0;
		border-radius: 999px;
		background: var(--color-bg-2);
		cursor: pointer;
		transition: background-color 150ms ease-out;
	}
	.toggle-track.on {
		background: var(--color-accent);
	}
	.toggle-thumb {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 20px;
		height: 20px;
		border-radius: 999px;
		background: #fff;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.15);
		transition: left 150ms ease-out;
	}
	.toggle-thumb.on {
		left: 21px;
	}
</style>
