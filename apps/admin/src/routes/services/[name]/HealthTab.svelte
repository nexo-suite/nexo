<script lang="ts">
	import type { ContainerInspect, HealthzResult } from '$lib/server/docker';
	import { enhance } from '$app/forms';
	import UptimeSparkline from './UptimeSparkline.svelte';

	interface HistoryRow {
		checkedAt: Date | string;
		ok: boolean;
		latencyMs: number | null;
	}

	interface Props {
		container: ContainerInspect;
		healthz: HealthzResult | null;
		history?: HistoryRow[];
		fmtRelative: (iso: string | number | null) => string;
	}

	let { container, healthz: initialHealthz, history = [], fmtRelative }: Props = $props();

	let healthz = $state<HealthzResult | null>(initialHealthz ?? null);
	let lastChecked = $state<number>(Date.now());
	let busy = $state(false);

	const dockerLog = $derived(container.State.Health?.Log?.slice().reverse() ?? []);
	const checks = $derived(healthz?.body?.checks ?? {});
	const checkEntries = $derived(Object.entries(checks));
	const passing = $derived(checkEntries.filter(([, v]) => v.ok).length);
	const total = $derived(checkEntries.length);
	const summaryTone = $derived(
		!healthz
			? 'mute'
			: !healthz.ok
				? 'err'
				: passing === total
					? 'ok'
					: passing > 0
						? 'warn'
						: 'err'
	);
</script>

<div class="fade-in">
	<div class="health-summary">
		<div>
			{#if healthz?.body}
				<div class="health-count {summaryTone}">{passing} / {total} passing</div>
				<div class="health-meta">
					checked {fmtRelative(lastChecked)} · {healthz.latency_ms}ms · v{healthz.body.version ??
						'?'}
				</div>
			{:else if healthz?.error}
				<div class="health-count err">unreachable</div>
				<div class="health-meta">{healthz.error}</div>
			{:else}
				<div class="health-count mute">—</div>
				<div class="health-meta">No /healthz response</div>
			{/if}
		</div>
		<form
			method="POST"
			action="?/recheck"
			use:enhance={() => {
				busy = true;
				return async ({ result, update }) => {
					if (result.type === 'success' && result.data) {
						const data = result.data as { healthz?: HealthzResult };
						if (data.healthz) {
							healthz = data.healthz;
							lastChecked = Date.now();
						}
					}
					await update({ reset: false });
					busy = false;
				};
			}}
		>
			<button type="submit" class="btn btn-ghost btn-small" disabled={busy}>
				{#if busy}
					<span class="spinner"></span>
				{:else}
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"
						><path d="M3 8a5 5 0 018-3.5M13 8a5 5 0 01-8 3.5" /><path
							d="M11 2v3h-3M5 14v-3h3"
							stroke-linecap="round"
						/></svg
					>
				{/if}
				Recheck
			</button>
		</form>
	</div>

	{#if checkEntries.length > 0}
		<div class="row-stack" style="margin-top:10px">
			{#each checkEntries as [name, c] (name)}
				<div class="hc">
					<div class="hc-icon {c.ok ? 'ok' : 'err'}">
						{#if c.ok}
							<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"
								><path d="M3 8l3.5 3.5L13 5" stroke-linecap="round" stroke-linejoin="round" /></svg
							>
						{:else}
							<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"
								><circle cx="8" cy="8" r="6" /><path
									d="M5 5l6 6M11 5l-6 6"
									stroke-linecap="round"
								/></svg
							>
						{/if}
					</div>
					<div class="hc-body">
						<div class="hc-title">{name}</div>
						<div class="hc-out">
							{#if c.ok}
								{c.latency_ms ?? 0}ms
							{:else}
								{c.error ?? 'failed'}
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else if healthz?.body}
		<div class="empty">
			<div class="em">○</div>
			<div>This app's /healthz returned no checks.</div>
		</div>
	{/if}

	{#if dockerLog.length > 0}
		<div class="docker-log">
			<div class="docker-log-h">Docker healthcheck history</div>
			<div class="docker-pips">
				{#each dockerLog.slice(0, 20) as entry, i (i)}
					<span
						class="pip {entry.ExitCode === 0 ? 'ok' : 'err'}"
						title={`${new Date(entry.Start).toLocaleString()}: ${entry.ExitCode === 0 ? 'pass' : 'fail'}`}
					></span>
				{/each}
			</div>
		</div>
	{/if}

	<UptimeSparkline {history} />
</div>

<style>
	.health-summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.health-count {
		font-size: 22px;
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.1;
	}
	.health-count.ok {
		color: var(--accent-ink);
	}
	.health-count.warn {
		color: var(--warn-ink);
	}
	.health-count.err {
		color: var(--err-ink);
	}
	.health-count.mute {
		color: var(--color-text-faint);
	}

	.health-meta {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-text-subtle);
		margin-top: 4px;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 32px;
		padding: 0 10px;
		font-size: 12px;
		font-weight: 500;
		border-radius: var(--radius-md);
		border: 0;
		background: var(--color-bg-2);
		color: var(--color-text-primary);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.btn svg {
		width: 14px;
		height: 14px;
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

	.empty {
		text-align: center;
		padding: 24px;
		color: var(--color-text-subtle);
		font-size: 13px;
	}
	.empty .em {
		font-size: 26px;
		opacity: 0.4;
		margin-bottom: 6px;
	}

	.docker-log {
		margin-top: 14px;
		padding: 12px 14px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}
	.docker-log-h {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
		margin-bottom: 8px;
	}
	.docker-pips {
		display: flex;
		gap: 3px;
		flex-wrap: wrap;
	}
	.pip {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 2px;
	}
	.pip.ok {
		background: var(--accent-ink);
		opacity: 0.85;
	}
	.pip.err {
		background: var(--err-ink);
	}
</style>
