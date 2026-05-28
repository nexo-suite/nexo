<script lang="ts">
	import { BottomSheet } from '@nexo/ui';
	import { m } from '$lib/paraglide/messages.js';

	let {
		open = $bindable(false),
		signOutHref
	}: { open?: boolean; signOutHref: string } = $props();
</script>

<BottomSheet bind:open title={m.sheet_title_signout()}>
	<p class="sub">{m.sheet_signout_sub()}</p>
	<div class="actions">
		<button type="button" class="secondary" onclick={() => (open = false)}>
			{m.sheet_signout_stay()}
		</button>
		<a href={signOutHref} class="danger">{m.sheet_signout_confirm()}</a>
	</div>
</BottomSheet>

<style>
	.sub {
		font-size: 13.5px;
		color: var(--color-text-subtle);
		line-height: 1.5;
		margin: 0 0 4px;
	}
	.actions {
		display: flex;
		gap: 10px;
		margin-top: 16px;
	}
	.secondary,
	.danger {
		all: unset;
		flex: 1;
		height: 48px;
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		border-radius: var(--radius-md);
		display: grid;
		place-items: center;
		text-align: center;
		cursor: pointer;
	}
	.secondary {
		color: var(--color-text-primary);
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-default);
	}
	.danger {
		color: #fff;
		background: var(--color-expense, #dc2626);
		text-decoration: none;
	}
	.secondary:active,
	.danger:active {
		opacity: 0.85;
	}
</style>
