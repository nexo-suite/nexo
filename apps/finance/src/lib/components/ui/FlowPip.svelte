<script lang="ts">
	let { type }: { type: 'income' | 'expense' | 'debt' } = $props();
</script>

<span
	class="inline-block size-[7px] shrink-0 rounded-full"
	class:bg-income={type === 'income'}
	class:bg-expense={type === 'expense'}
	class:bg-debt={type === 'debt'}
></span>
