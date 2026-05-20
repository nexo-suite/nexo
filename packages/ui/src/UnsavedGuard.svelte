<script lang="ts">
	import { beforeNavigate, goto } from '$app/navigation';
	import BottomSheet from './BottomSheet.svelte';

	let {
		dirty,
		formId,
		onDiscard,
		title = 'Unsaved changes',
		description = "You have changes that haven't been saved yet.",
		saveLabel = 'Save & stay',
		discardLabel = 'Discard & leave'
	}: {
		dirty: boolean;
		formId: string;
		onDiscard: () => void;
		title?: string;
		description?: string;
		saveLabel?: string;
		discardLabel?: string;
	} = $props();

	let open = $state(false);
	let pendingUrl: string | null = $state(null);

	beforeNavigate(({ cancel, to, type }) => {
		if (type === 'form') return;
		if (dirty && !open) {
			cancel();
			pendingUrl = to?.url.pathname ?? null;
			open = true;
		}
	});

	function discardAndGo() {
		onDiscard();
		open = false;
		if (pendingUrl) {
			const target = pendingUrl;
			pendingUrl = null;
			void goto(target);
		}
	}
</script>

<BottomSheet bind:open {title} subtitle={description}>
	<div class="ug-actions">
		<button type="submit" form={formId} class="ug-btn save" onclick={() => (open = false)}>
			{saveLabel}
		</button>
		<button type="button" class="ug-btn discard" onclick={discardAndGo}>
			{discardLabel}
		</button>
	</div>
</BottomSheet>

<style>
	.ug-actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.ug-btn {
		width: 100%;
		height: 48px;
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		border-radius: var(--radius-md, 12px);
		border: none;
		cursor: pointer;
	}
	.ug-btn.save {
		background: var(--accent, #18181b);
		color: #fff;
	}
	.ug-btn.discard {
		background: var(--bg-1, #f4f4f5);
		border: 1px solid var(--border-default, #e4e4e7);
		color: var(--text-muted, #71717a);
	}
</style>
