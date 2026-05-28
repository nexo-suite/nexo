<script lang="ts" generics="V extends string">
	import type { Snippet } from 'svelte';
	import BottomSheet from './BottomSheet.svelte';

	type Option = {
		value: V;
		label: string;
		description?: string;
		icon?: string;
		// Renders the row dimmed and non-interactive — useful for
		// "coming soon" choices that should still be visible.
		disabled?: boolean;
	};

	let {
		open = $bindable(false),
		title,
		subtitle,
		value = $bindable(),
		options,
		doneLabel = 'Done',
		stubNotice,
		footer
	}: {
		open?: boolean;
		title: string;
		subtitle?: string;
		value: V;
		options: readonly Option[];
		doneLabel?: string;
		// Optional callout shown below the picker when at least one
		// disabled option is present (e.g. "More themes coming later").
		stubNotice?: string;
		footer?: Snippet;
	} = $props();
</script>

<BottomSheet bind:open {title}>
	{#if subtitle}
		<p class="sub">{subtitle}</p>
	{/if}
	<div class="picker">
		{#each options as opt (opt.value)}
			<button
				type="button"
				class="opt"
				class:active={opt.value === value}
				class:disabled={opt.disabled}
				disabled={opt.disabled}
				onclick={() => !opt.disabled && (value = opt.value)}
			>
				{#if opt.icon}
					<span class="opt-icon">{opt.icon}</span>
				{/if}
				<div class="opt-text">
					<span class="opt-name">{opt.label}</span>
					{#if opt.description}
						<span class="opt-desc">{opt.description}</span>
					{/if}
				</div>
				<span class="radio"></span>
			</button>
		{/each}
	</div>
	{#if stubNotice}
		<div class="stub-notice">{stubNotice}</div>
	{/if}
	{@render footer?.()}
	<button type="button" class="done" onclick={() => (open = false)}>{doneLabel}</button>
</BottomSheet>

<style>
	.sub {
		font-size: 13.5px;
		color: var(--color-text-subtle);
		line-height: 1.5;
		margin: 0 0 4px;
	}

	.picker {
		margin-top: 14px;
		display: flex;
		flex-direction: column;
		background: var(--color-bg-1);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.opt {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 13px 14px;
		border: none;
		border-top: 1px solid var(--color-border-subtle);
		background: transparent;
		cursor: pointer;
		font: inherit;
		color: inherit;
		width: 100%;
		text-align: left;
		transition: background var(--duration-fast) var(--ease-out);
	}

	.opt:first-child {
		border-top: 0;
	}

	.opt:active {
		background: var(--color-bg-2);
	}

	.opt.disabled {
		opacity: 0.55;
		cursor: default;
	}

	.opt.disabled:active {
		background: transparent;
	}

	.stub-notice {
		font-size: 12px;
		color: var(--color-text-subtle);
		background: var(--color-bg-1);
		padding: 10px 12px;
		border-radius: var(--radius-sm, 8px);
		margin-top: 12px;
		line-height: 1.4;
	}

	.opt-icon {
		width: 28px;
		height: 28px;
		border-radius: 7px;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-subtle);
		display: grid;
		place-items: center;
		font-size: 14px;
		flex-shrink: 0;
	}

	.opt-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.opt-name {
		font-size: 14.5px;
		font-weight: 500;
		letter-spacing: -0.005em;
	}

	.opt.active .opt-name {
		color: color-mix(in oklab, var(--color-accent) 80%, #000);
	}

	.opt-desc {
		font-size: 11.5px;
		color: var(--color-text-subtle);
	}

	.radio {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 2px solid var(--color-border-strong);
		flex-shrink: 0;
		position: relative;
		transition: border-color var(--duration-fast) var(--ease-out);
	}

	.opt.active .radio {
		border-color: var(--color-accent);
	}

	.opt.active .radio::after {
		content: '';
		position: absolute;
		inset: 3px;
		border-radius: 50%;
		background: var(--color-accent);
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
		color: var(--color-text-on-accent, #fff);
		background: var(--color-accent);
		border-radius: var(--radius-md);
		cursor: pointer;
	}

	.done:active {
		opacity: 0.85;
	}
</style>
