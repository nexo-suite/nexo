<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SvelteSet } from 'svelte/reactivity';

	const APP_ICONS: Record<string, string> = {
		finance: '/icon-finance.svg',
		flaschen: '/icon-flaschen.svg',
		gym: '/icon-gym.svg'
	};

	type UserEntry = {
		type: 'user';
		id: string;
		email: string;
		name: string;
		image: string | null;
		createdAt: string;
		allowed: boolean;
		apps: string[];
	};

	type KnownApp = { id: string; label: string };

	interface Props {
		entry: UserEntry;
		knownApps: readonly KnownApp[];
		pendingApps: SvelteSet<string>;
	}

	let { entry, knownApps, pendingApps }: Props = $props();

	let accessSaved = $state(false);

	const accessDirty = $derived(
		entry.apps.some((a) => !pendingApps.has(a)) ||
			[...pendingApps].some((a) => !entry.apps.includes(a))
	);
</script>

<div class="section-h">
	<h3>App access</h3>
	<span class="meta-label">{[...pendingApps].length}/{knownApps.length}</span>
</div>
<form
	method="POST"
	action="?/updateAccess"
	use:enhance={() =>
		async ({ update }) => {
			await update({ reset: false });
			accessSaved = true;
			setTimeout(() => (accessSaved = false), 2000);
		}}
>
	<input type="hidden" name="userId" value={entry.id} />
	{#each [...pendingApps] as app (app)}
		<input type="hidden" name="apps" value={app} />
	{/each}
	<div class="row-stack" style="margin-bottom:10px">
		{#each knownApps as app (app.id)}
			{@const granted = pendingApps.has(app.id)}
			{@const iconUrl = APP_ICONS[app.id]}
			<div class="app-toggle">
				{#if iconUrl}
					<img class="app-icon app-icon-img" src={iconUrl} alt="" width="36" height="36" />
				{:else}
					<div class="app-icon app-{app.id}">{app.label[0]}</div>
				{/if}
				<div>
					<div class="app-name">{app.label}</div>
				</div>
				<button
					type="button"
					class="toggle {granted ? 'on' : ''}"
					aria-label="Toggle {app.label} access"
					aria-pressed={granted}
					onclick={() => {
						if (granted) pendingApps.delete(app.id);
						else pendingApps.add(app.id);
						accessSaved = false;
					}}
				></button>
			</div>
		{/each}
	</div>
	{#if accessDirty}
		<button type="submit" class="btn btn-primary btn-block">Save access</button>
	{:else if accessSaved}
		<div class="saved-label">✓ Access saved</div>
	{/if}
</form>

<style>
	.section-h {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 4px;
	}

	.section-h h3 {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: var(--color-text-subtle);
		text-transform: uppercase;
	}

	.meta-label {
		color: var(--color-text-faint);
		font-size: 12px;
		font-family: var(--font-mono);
	}

	.app-toggle {
		display: grid;
		grid-template-columns: 36px 1fr auto;
		gap: 12px;
		align-items: center;
		padding: 12px 14px;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.app-toggle:last-child {
		border-bottom: 0;
	}

	.app-icon {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		display: grid;
		place-items: center;
		font-family: var(--font-mono);
		font-weight: 500;
		font-size: 16px;
		color: #fff;
	}

	.app-icon.app-finance {
		background: linear-gradient(135deg, #16a34a, #166534);
	}
	.app-icon.app-flaschen {
		background: linear-gradient(135deg, #a50a50, #5e0a30);
	}
	.app-icon.app-gym {
		background: linear-gradient(135deg, #f97316, #9a3412);
	}
	.app-icon.app-pomodoro {
		background: linear-gradient(135deg, #ef4444, #991b1b);
	}

	.app-icon-img {
		background: transparent;
		border: 0;
		padding: 0;
		object-fit: contain;
	}

	.app-name {
		font-size: 14px;
		font-weight: 500;
	}

	.saved-label {
		text-align: center;
		font-size: 13px;
		font-weight: 600;
		color: var(--ok-ink);
		padding: 8px;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		min-height: 44px;
		padding: 0 18px;
		font-size: 15px;
		font-weight: 500;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			background var(--duration-fast) var(--ease-out),
			transform var(--duration-fast) var(--ease-out);
		background: transparent;
		color: var(--color-text-primary);
	}

	.btn-primary {
		background: var(--color-accent);
		color: #fff;
		font-weight: 600;
	}

	.btn-block {
		width: 100%;
	}
</style>
