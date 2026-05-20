<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { PageHeader } from '@nexo/ui';
	import InfoTab from './InfoTab.svelte';
	import HealthTab from './HealthTab.svelte';
	import LogsViewer from './LogsViewer.svelte';
	import BottomSheet from '$lib/components/BottomSheet.svelte';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import { fmtRelative } from '$lib/utils';

	let { data, form } = $props();
	const container = $derived(data.container);
	const name = $derived(page.params.name ?? '');

	const displayTitle = $derived(
		name
			.replace(/^nexo-/, '')
			.replace(/-\d+$/, '')
			.replace(/_/g, ' ')
	);

	function formatDate(iso: string) {
		if (!iso || iso.startsWith('0001')) return '—';
		return new Date(iso).toLocaleString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function uptime(startedAt: string) {
		if (!startedAt || startedAt.startsWith('0001')) return '—';
		const ms = Date.now() - new Date(startedAt).getTime();
		const s = Math.floor(ms / 1000);
		if (s < 60) return `${s}s`;
		const m = Math.floor(s / 60);
		if (m < 60) return `${m}m`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ${m % 60}m`;
		return `${Math.floor(h / 24)}d ${h % 24}h`;
	}

	const healthStatus = $derived(container.State.Health?.Status ?? null);
	const networks = $derived(Object.keys(container.NetworkSettings.Networks));
	const imageShort = $derived(container.Config.Image.split('/').pop() ?? container.Config.Image);
	const restartPolicy = $derived(container.HostConfig.RestartPolicy.Name);
	const tone = $derived(
		container.State.Status.toLowerCase() === 'restarting'
			? 'err'
			: container.State.Running
				? healthStatus === 'unhealthy'
					? 'err'
					: healthStatus === 'starting'
						? 'warn'
						: 'ok'
				: 'mute'
	);
	const statusLabel = $derived(
		container.State.Status === 'restarting'
			? 'Restarting'
			: container.State.Running
				? healthStatus
					? healthStatus.charAt(0).toUpperCase() + healthStatus.slice(1)
					: 'Running'
				: 'Stopped'
	);

	let activeTab = $state<'info' | 'health' | 'logs'>('info');

	type ActionVerb = 'start' | 'stop' | 'restart';
	let confirmOpen = $state(false);
	let confirmVerb = $state<ActionVerb>('restart');
	let busyVerb = $state<ActionVerb | null>(null);
	let optimisticStatus = $state<string | null>(null);

	function ask(verb: ActionVerb) {
		confirmVerb = verb;
		confirmOpen = true;
	}

	const verbCopy: Record<ActionVerb, { title: string; body: string; cta: string }> = {
		start: {
			title: 'Start container?',
			body: 'Boots the container with its existing config.',
			cta: 'Start'
		},
		stop: {
			title: 'Stop container?',
			body: '10 seconds for a graceful shutdown, then SIGKILL.',
			cta: 'Stop'
		},
		restart: {
			title: 'Restart container?',
			body: 'Stops gracefully (10s timeout), then starts again.',
			cta: 'Restart'
		}
	};
	const displayStatus = $derived(optimisticStatus ?? statusLabel);

	let menuOpen = $state(false);
	let inspectOpen = $state(false);
	let copied = $state(false);

	async function copyId() {
		try {
			await navigator.clipboard.writeText(container.Id);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// ignore
		}
	}
</script>

<div class="screen">
	<PageHeader title={displayTitle} backHref="/services">
		{#snippet avatar()}
			<UserAvatarMenu />
		{/snippet}
	</PageHeader>

	{#if form?.error === 'DOCKER_ERROR'}
		<div class="banner err">
			Failed to {form.verb} — check logs (id: {form.correlationId}).
		</div>
	{/if}

	<!-- Status card -->
	<div class="status-card">
		<div class="status-card-head">
			<span class="ctn-dot {tone}"></span>
			<span class="pill {tone}">{displayStatus}</span>
			<span class="uptime-label">up {uptime(container.State.StartedAt)}</span>
		</div>
		<div class="status-card-name">{imageShort}</div>
		<div class="status-card-actions">
			{#if container.State.Running}
				<button
					type="button"
					class="btn btn-secondary btn-small"
					disabled={busyVerb !== null}
					onclick={() => ask('restart')}
				>
					{#if busyVerb === 'restart'}
						<span class="spinner"></span>
					{:else}
						<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"
							><path d="M3 8a5 5 0 018-3.5M13 8a5 5 0 01-8 3.5" /><path
								d="M11 2v3h-3M5 14v-3h3"
								stroke-linecap="round"
							/></svg
						>
					{/if}
					Restart
				</button>
				<button
					type="button"
					class="btn btn-ghost btn-small"
					disabled={busyVerb !== null}
					onclick={() => ask('stop')}
				>
					{#if busyVerb === 'stop'}
						<span class="spinner"></span>
					{:else}
						<svg viewBox="0 0 16 16" fill="currentColor"
							><rect x="4" y="3" width="3" height="10" rx="1" /><rect
								x="9"
								y="3"
								width="3"
								height="10"
								rx="1"
							/></svg
						>
					{/if}
					Stop
				</button>
			{:else}
				<button
					type="button"
					class="btn btn-primary btn-small"
					disabled={busyVerb !== null}
					onclick={() => ask('start')}
				>
					{#if busyVerb === 'start'}
						<span class="spinner"></span>
					{:else}
						<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 3l9 5-9 5z" /></svg>
					{/if}
					Start
				</button>
			{/if}
			<button type="button" class="btn btn-ghost btn-small" onclick={() => (activeTab = 'logs')}>
				Logs →
			</button>
			<button
				type="button"
				class="btn btn-ghost btn-small btn-icon"
				onclick={() => (menuOpen = true)}
				aria-label="More"
			>
				<svg viewBox="0 0 16 16" fill="currentColor"
					><circle cx="3" cy="8" r="1.4" /><circle cx="8" cy="8" r="1.4" /><circle
						cx="13"
						cy="8"
						r="1.4"
					/></svg
				>
			</button>
		</div>
	</div>

	<!-- Segmented tabs -->
	<div class="segmented">
		<button
			type="button"
			class="seg"
			class:active={activeTab === 'info'}
			onclick={() => (activeTab = 'info')}>Info</button
		>
		<button
			type="button"
			class="seg"
			class:active={activeTab === 'health'}
			onclick={() => (activeTab = 'health')}
		>
			Health
			{#if healthStatus === 'unhealthy' || healthStatus === 'starting'}
				<span class="seg-dot {healthStatus === 'unhealthy' ? 'err' : 'warn'}"></span>
			{/if}
		</button>
		<button
			type="button"
			class="seg"
			class:active={activeTab === 'logs'}
			onclick={() => (activeTab = 'logs')}>Logs</button
		>
	</div>

	{#if activeTab === 'info'}
		<InfoTab {container} stats={data.stats} {formatDate} {restartPolicy} {networks} />
	{/if}

	{#if activeTab === 'health'}
		<HealthTab {container} healthz={data.healthz} history={data.history} {fmtRelative} />
	{/if}

	{#if activeTab === 'logs'}
		<LogsViewer serviceName={name} />
	{/if}
</div>

<BottomSheet bind:open={confirmOpen} title={verbCopy[confirmVerb].title}>
	<p class="confirm-body">{verbCopy[confirmVerb].body}</p>
	<form
		method="POST"
		action="?/{confirmVerb}"
		use:enhance={() => {
			const verb = confirmVerb;
			busyVerb = verb;
			optimisticStatus = verb === 'stop' ? 'Stopping…' : 'Restarting…';
			confirmOpen = false;
			return async ({ update }) => {
				await update();
				busyVerb = null;
				optimisticStatus = null;
			};
		}}
	>
		<div class="confirm-actions">
			<button
				type="button"
				class="btn btn-secondary"
				onclick={() => (confirmOpen = false)}
				disabled={busyVerb !== null}
			>
				Cancel
			</button>
			<button
				type="submit"
				class="btn"
				class:btn-primary={confirmVerb === 'start'}
				class:btn-danger={confirmVerb !== 'start'}
				disabled={busyVerb !== null}
			>
				{verbCopy[confirmVerb].cta}
			</button>
		</div>
	</form>
</BottomSheet>

<BottomSheet bind:open={menuOpen} title="Container actions">
	<div class="menu-stack">
		<button
			type="button"
			class="menu-row"
			onclick={() => {
				menuOpen = false;
				inspectOpen = true;
			}}
		>
			<span class="menu-icon">📄</span>
			<span class="menu-label">Inspect JSON</span>
			<span class="menu-arrow">→</span>
		</button>
		<button
			type="button"
			class="menu-row"
			onclick={() => {
				void copyId();
				menuOpen = false;
			}}
		>
			<span class="menu-icon">📋</span>
			<span class="menu-label">{copied ? 'Copied!' : 'Copy container ID'}</span>
			<span class="menu-id mono">{container.Id.slice(0, 12)}</span>
		</button>
	</div>
</BottomSheet>

<BottomSheet bind:open={inspectOpen} title="Inspect" subtitle={container.Name?.replace(/^\//, '')}>
	<pre class="inspect-pre">{JSON.stringify(container, null, 2)}</pre>
</BottomSheet>

<style>
	.screen {
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.banner.err {
		padding: 10px 14px;
		border-radius: var(--radius-md);
		font-size: 13px;
		background: color-mix(in oklab, var(--err-ink) 8%, transparent);
		border: 1px solid color-mix(in oklab, var(--err-ink) 30%, transparent);
		color: var(--err-ink);
	}

	/* ── Status card ── */
	.status-card {
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 14px;
	}

	.status-card-head {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}

	.uptime-label {
		margin-left: auto;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}

	.status-card-name {
		font-size: 17px;
		font-weight: 600;
		letter-spacing: -0.015em;
		color: var(--color-text-primary);
		font-family: var(--font-mono);
		margin-bottom: 10px;
	}

	.status-card-actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	/* ── Buttons ── */
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 36px;
		padding: 0 12px;
		font-size: 13px;
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

	.btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.btn svg {
		width: 14px;
		height: 14px;
	}

	.btn-primary {
		background: var(--color-accent);
		color: #fff;
		font-weight: 600;
	}

	.btn-secondary {
		border-color: var(--color-border-strong);
		background: var(--color-surface-1);
	}

	.btn-ghost {
		background: var(--color-bg-2);
	}

	.btn-danger {
		background: var(--err-ink);
		border-color: var(--err-ink);
		color: #fff;
		font-weight: 600;
	}

	.btn-small {
		min-height: 32px;
		padding: 0 10px;
		font-size: 12px;
	}

	.spinner {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 2px solid currentColor;
		border-right-color: transparent;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ── Segmented ── */
	.segmented {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: 1fr;
		background: var(--color-bg-2);
		padding: 3px;
		border-radius: 10px;
		position: sticky;
		top: calc(var(--topbar-h) + var(--safe-top));
		z-index: 4;
	}

	.seg {
		padding: 8px 10px;
		border-radius: 8px;
		background: transparent;
		border: 0;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-muted);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: all var(--duration-fast) var(--ease-out);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
	}

	.seg.active {
		background: var(--color-surface-1);
		color: var(--color-text-primary);
		box-shadow:
			0 1px 2px rgb(0 0 0 / 0.06),
			0 1px 0 rgb(0 0 0 / 0.04);
	}

	.seg-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.seg-dot.err {
		background: var(--err);
	}
	.seg-dot.warn {
		background: var(--warn);
	}

	.confirm-body {
		color: var(--color-text-subtle);
		font-size: 14px;
		line-height: 1.5;
		margin: 0 0 16px;
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}

	.btn-icon {
		padding: 0;
		width: 32px;
	}
	.btn-icon svg {
		width: 16px;
		height: 16px;
	}

	.menu-stack {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.menu-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 12px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		cursor: pointer;
		text-align: left;
	}
	.menu-icon {
		font-size: 18px;
		flex-shrink: 0;
	}
	.menu-label {
		flex: 1;
		font-size: 14px;
	}
	.menu-arrow {
		color: var(--color-text-faint);
	}
	.menu-id {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-text-faint);
	}

	.inspect-pre {
		font-family: var(--font-mono);
		font-size: 11px;
		line-height: 1.45;
		max-height: 60vh;
		overflow: auto;
		padding: 12px;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		white-space: pre;
	}
</style>
