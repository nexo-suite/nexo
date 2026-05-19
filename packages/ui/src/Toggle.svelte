<script lang="ts">
	let {
		checked = $bindable(false),
		ariaLabel,
		onchange
	}: {
		checked?: boolean;
		ariaLabel: string;
		onchange?: (next: boolean) => void;
	} = $props();

	function toggle() {
		const next = !checked;
		checked = next;
		onchange?.(next);
	}
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={ariaLabel}
	onclick={toggle}
	class="toggle"
	class:on={checked}
>
	<span class="toggle-thumb" class:on={checked}></span>
</button>
