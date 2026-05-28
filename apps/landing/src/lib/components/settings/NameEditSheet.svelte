<script lang="ts">
	import { BottomSheet } from '@nexo/ui';
	import { m } from '$lib/paraglide/messages.js';

	let {
		open = $bindable(false),
		value = $bindable('')
	}: { open?: boolean; value: string } = $props();
</script>

<BottomSheet bind:open title={m.sheet_title_name()}>
	<p class="sub">{m.sheet_name_sub()}</p>
	<div class="field">
		<label for="sheetName">{m.sheet_name_label()}</label>
		<input
			id="sheetName"
			type="text"
			bind:value
			maxlength="32"
			placeholder={m.sheet_name_placeholder()}
		/>
	</div>
	<div class="hint">{m.sheet_name_hint()}</div>
	<button type="button" class="done" onclick={() => (open = false)}>
		{m.sheet_action_done()}
	</button>
</BottomSheet>

<style>
	.sub {
		font-size: 13.5px;
		color: var(--color-text-subtle);
		line-height: 1.5;
		margin: 0 0 4px;
	}
	.field {
		margin-top: 14px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.field label {
		font-size: 11.5px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
	}
	.field input {
		all: unset;
		padding: 12px 14px;
		font: inherit;
		font-size: 15px;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}
	.field input:focus {
		border-color: var(--color-accent);
	}
	.hint {
		font-size: 12px;
		color: var(--color-text-subtle);
		margin-top: 8px;
		line-height: 1.4;
	}
	.done {
		all: unset;
		display: block;
		width: 100%;
		padding: 14px;
		margin-top: 16px;
		text-align: center;
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		color: #fff;
		background: var(--color-accent);
		border-radius: var(--radius-md);
		cursor: pointer;
	}
	.done:active {
		opacity: 0.85;
	}
</style>
