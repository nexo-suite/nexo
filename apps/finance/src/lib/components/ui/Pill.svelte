<script lang="ts">
	import type { Snippet } from 'svelte';

	let { active = false, children }: { active?: boolean; children: Snippet } = $props();
</script>

<span
	class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[12px] whitespace-nowrap
	       transition-colors"
	class:bg-text-primary={active}
	class:text-bg-0={active}
	class:border-text-primary={active}
	class:bg-surface-1={!active}
	class:text-text-muted={!active}
	class:border-border-default={!active}
	style="height: 28px;"
>
	{@render children()}
</span>
