<script lang="ts">
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { BottomSheet, PageHeader } from '@nexo/ui';
	import { ExternalLink, RotateCw } from '@lucide/svelte';
	import UptimeSparkline from './UptimeSparkline.svelte';
	import StatusPill from '$lib/components/StatusPill.svelte';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import { fmtRelative } from '$lib/utils';
	import {
		ctnState,
		ctnComposeProfile,
		type CtnState,
		type HealthzSnapshot
	} from '$lib/utils/containers';
	import { grafanaConfigured, grafanaContainerUrl, grafanaLogsUrl } from '$lib/utils/grafana';
	import type { ContainerInfo } from '$lib/server/docker';
	import { m } from '$lib/paraglide/messages.js';

	let { data, form } = $props();
	const container = $derived(data.container);
	const name = $derived(page.params.name ?? '');
	const displayTitle = $derived(
		name
			.replace(/^nexo-/, '')
			.replace(/-\d+$/, '')
			.replace(/_/g, ' ')
	);

	// Synthesize a ContainerInfo-shape so ctnState (which expects the list shape)
	// works against the inspect result. The list and inspect endpoints disagree
	// on field casing in a couple of spots; what we need for ctnState is just
	// `Status`, `State`, `Labels`, `NetworkSettings`.
	const containerLike: ContainerInfo & { Healthz?: HealthzSnapshot } = $derived({
		Id: container.Id,
		Names: [container.Name ?? ''],
		Image: container.Config.Image,
		ImageID: container.Image,
		Command: '',
		Created: 0,
		Ports: [],
		Labels: container.Config.Labels ?? {},
		State: container.State.Status,
		Status: humanStatus(container.State),
		HostConfig: { NetworkMode: '' },
		NetworkSettings: container.NetworkSettings,
		Mounts: [],
		Healthz: data.healthz
			? {
					ok: data.healthz.ok,
					checkedAt: new Date(),
					error: data.healthz.error ?? null,
					latencyMs: data.healthz.latency_ms ?? null
				}
			: undefined
	}) as unknown as ContainerInfo & { Healthz?: HealthzSnapshot };

	function humanStatus(state: typeof container.State): string {
		const base = state.Running ? `Up ${uptime(state.StartedAt)}` : state.Status;
		const h = state.Health?.Status;
		if (!h) return base;
		if (h === 'unhealthy') return `${base} (unhealthy)`;
		if (h === 'starting') return `${base} (health: starting)`;
		if (h === 'healthy') return `${base} (healthy)`;
		return base;
	}

	const serviceState: CtnState = $derived(ctnState(containerLike));
	const serviceStateLabel = $derived.by(() => {
		switch (serviceState) {
			case 'down':
				return m.pill_down();
			case 'pending':
				return m.pill_pending();
			case 'degraded':
				return m.pill_degraded();
			case 'ok':
				return m.pill_ok();
		}
	});
	const isPreview = $derived(ctnComposeProfile(containerLike) === 'preview');
	const grafanaOn = $derived(grafanaConfigured());

	const networks = $derived(Object.keys(container.NetworkSettings.Networks));
	const imageShort = $derived(container.Config.Image.split('/').pop() ?? container.Config.Image);
	const restartPolicy = $derived(container.HostConfig.RestartPolicy.Name);

	// `update()` from the recheck action invalidates the load fn, so data.healthz
	// is the freshest source — no need for a local mirror.
	const healthz = $derived(data.healthz);
	let lastChecked = $state<number>(Date.now());

	const checkEntries = $derived(healthz?.body?.checks ? Object.entries(healthz.body.checks) : []);
	const passing = $derived(checkEntries.filter(([, v]) => v.ok).length);
	const total = $derived(checkEntries.length);

	type ActionVerb = 'start' | 'stop' | 'restart';
	let confirmOpen = $state(false);
	let confirmVerb = $state<ActionVerb>('restart');
	let busyVerb = $state<ActionVerb | null>(null);
	let recheckBusy = $state(false);

	function ask(verb: ActionVerb) {
		confirmVerb = verb;
		confirmOpen = true;
	}

	const verbCopy: Record<ActionVerb, { title: string; body: string; cta: string }> = $derived({
		start: {
			title: m.services_confirm_start_title(),
			body: m.services_confirm_start_body(),
			cta: m.services_btn_start()
		},
		stop: {
			title: m.services_confirm_stop_title(),
			body: m.services_confirm_stop_body(),
			cta: m.services_btn_stop()
		},
		restart: {
			title: m.services_confirm_restart_title(),
			body: m.services_confirm_restart_body(),
			cta: m.services_btn_restart()
		}
	});

	function uptime(startedAt: string): string {
		if (!startedAt || startedAt.startsWith('0001')) return '—';
		const t = new Date(startedAt).getTime();
		if (!Number.isFinite(t)) return '—';
		const ms = Date.now() - t;
		if (ms < 0) return '—';
		const s = Math.floor(ms / 1000);
		if (s < 60) return `${s}s`;
		const m = Math.floor(s / 60);
		if (m < 60) return `${m}m`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ${m % 60}m`;
		return `${Math.floor(h / 24)}d ${h % 24}h`;
	}

	function formatDate(iso: string): string {
		if (!iso || iso.startsWith('0001')) return '—';
		return new Date(iso).toLocaleString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="page">
	<PageHeader title={displayTitle} backHref="/">
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
	</PageHeader>

	{#if form?.error === 'DOCKER_ERROR'}
		<div class="banner err">
			{m.services_action_failed({ verb: form.verb, correlationId: form.correlationId })}
		</div>
	{/if}

	<!-- ─── Header card: state + preview chip + uptime ─── -->
	<div class="hero">
		<div class="hero-row">
			<StatusPill state={serviceState}>{serviceStateLabel}</StatusPill>
			{#if isPreview}<span class="preview-chip">{m.preview_chip()}</span>{/if}
			{#if container.State.Running}
				<span class="uptime"
					>{m.services_uptime_prefix({ uptime: uptime(container.State.StartedAt) })}</span
				>
			{/if}
		</div>
		<div class="hero-image">{imageShort}</div>
	</div>

	<!-- ─── Health summary ─── -->
	<section class="card">
		<header class="card-head">
			<h2>{m.services_section_health()}</h2>
			<form
				method="POST"
				action="?/recheck"
				use:enhance={() => {
					recheckBusy = true;
					return async ({ update }) => {
						await update({ reset: false });
						lastChecked = Date.now();
						recheckBusy = false;
					};
				}}
			>
				<button
					type="submit"
					class="icon-btn"
					disabled={recheckBusy}
					aria-label={m.services_recheck_aria()}
				>
					<RotateCw size={14} strokeWidth={1.8} class={recheckBusy ? 'spin' : ''} />
				</button>
			</form>
		</header>
		{#if healthz?.body}
			<div class="health-line">
				<span class="health-count">{m.services_checks_passing({ passing, total })}</span>
				<span class="health-meta"
					>{m.services_checks_meta({
						when: fmtRelative(lastChecked),
						latency: healthz.latency_ms ?? 0
					})}</span
				>
			</div>
			{#if healthz.body.version}
				<div class="health-build">
					v{healthz.body.version}{#if healthz.body.commit}
						· {healthz.body.commit}{/if}{#if healthz.body.buildTime}
						· built {healthz.body.buildTime.slice(0, 16).replace('T', ' ')}{/if}
				</div>
			{/if}
			{#if checkEntries.length > 0}
				<ul class="checks">
					{#each checkEntries as [key, v] (key)}
						<li class:fail={!v.ok}>
							<span class="check-dot" class:ok={v.ok}></span>
							<span class="check-name">{key}</span>
							{#if v.latency_ms != null}<span class="check-latency">{v.latency_ms}ms</span>{/if}
							{#if !v.ok && v.error}<span class="check-error">{v.error}</span>{/if}
						</li>
					{/each}
				</ul>
			{/if}
		{:else if healthz?.error}
			<div class="health-line">
				<span class="health-count fail">{m.services_unreachable()}</span>
				<span class="health-meta">— {healthz.error}</span>
			</div>
		{:else}
			<div class="health-line muted">{m.services_no_healthz()}</div>
		{/if}
	</section>

	<!-- ─── 24h uptime sparkline ─── -->
	{#if data.history && data.history.length > 0}
		<section class="card">
			<header class="card-head"><h2>{m.services_section_last_24h()}</h2></header>
			<UptimeSparkline history={data.history} />
		</section>
	{/if}

	<!-- ─── Container metadata ─── -->
	<section class="card">
		<header class="card-head"><h2>{m.services_section_container()}</h2></header>
		<dl class="meta">
			<dt>{m.services_meta_image()}</dt>
			<dd class="mono">{container.Config.Image}</dd>
			<dt>{m.services_meta_id()}</dt>
			<dd class="mono">{container.Id.slice(0, 12)}</dd>
			<dt>{m.services_meta_started()}</dt>
			<dd>{formatDate(container.State.StartedAt)}</dd>
			<dt>{m.services_meta_restart_count()}</dt>
			<dd>{container.RestartCount ?? 0}</dd>
			<dt>{m.services_meta_restart_policy()}</dt>
			<dd class="mono">{restartPolicy || m.services_meta_no_policy()}</dd>
			<dt>{m.services_meta_networks()}</dt>
			<dd class="mono">{networks.join(', ') || m.common_dash()}</dd>
		</dl>
	</section>

	<!-- ─── Actions ─── -->
	<section class="card">
		<header class="card-head"><h2>{m.services_section_actions()}</h2></header>
		<div class="actions">
			{#if container.State.Running}
				<button
					type="button"
					class="btn btn-secondary"
					disabled={busyVerb !== null}
					onclick={() => ask('restart')}
				>
					{busyVerb === 'restart' ? '…' : m.services_btn_restart()}
				</button>
				<button
					type="button"
					class="btn btn-ghost"
					disabled={busyVerb !== null}
					onclick={() => ask('stop')}
				>
					{busyVerb === 'stop' ? '…' : m.services_btn_stop()}
				</button>
			{:else}
				<button
					type="button"
					class="btn btn-primary"
					disabled={busyVerb !== null}
					onclick={() => ask('start')}
				>
					{busyVerb === 'start' ? '…' : m.services_btn_start()}
				</button>
			{/if}
		</div>
	</section>

	<!-- ─── Grafana deep-links ─── -->
	{#if grafanaOn}
		{@const cleanName = (container.Name ?? '').replace(/^\//, '')}
		<section class="card">
			<header class="card-head"><h2>{m.services_section_grafana()}</h2></header>
			<div class="actions">
				<a
					class="btn btn-ghost"
					href={grafanaLogsUrl({ service: cleanName })}
					target="_blank"
					rel="noreferrer"
				>
					{m.services_grafana_logs()} <ExternalLink size={13} strokeWidth={1.8} />
				</a>
				<a
					class="btn btn-ghost"
					href={grafanaContainerUrl(cleanName)}
					target="_blank"
					rel="noreferrer"
				>
					{m.services_grafana_metrics()} <ExternalLink size={13} strokeWidth={1.8} />
				</a>
			</div>
		</section>
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
			return async ({ update }) => {
				await update();
				busyVerb = null;
				confirmOpen = false;
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
				{m.common_cancel()}
			</button>
			<button
				type="submit"
				class="btn"
				class:btn-primary={confirmVerb === 'start'}
				class:btn-danger={confirmVerb !== 'start'}
				disabled={busyVerb !== null}
			>
				{busyVerb !== null ? '…' : verbCopy[confirmVerb].cta}
			</button>
		</div>
	</form>
</BottomSheet>

<style>
	.page {
		padding: 12px 16px calc(16px + env(safe-area-inset-bottom, 0));
		max-width: 720px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.banner.err {
		padding: 10px 14px;
		border-radius: var(--radius-md);
		font-size: 13px;
		background: color-mix(in oklab, oklch(0.59 0.2 27) 8%, transparent);
		border: 1px solid color-mix(in oklab, oklch(0.59 0.2 27) 30%, transparent);
		color: oklch(0.59 0.2 27);
	}

	/* ── Hero ── */
	.hero {
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		padding: 16px;
	}
	.hero-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	.uptime {
		margin-left: auto;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}
	.hero-image {
		margin-top: 12px;
		font-family: var(--font-mono);
		font-size: 13px;
		color: var(--color-text-muted);
		word-break: break-all;
	}
	.preview-chip {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 2px 7px;
		border-radius: 4px;
		color: oklch(0.74 0.16 78);
		background: color-mix(in oklab, oklch(0.74 0.16 78) 12%, var(--color-bg-1));
		border: 1px solid color-mix(in oklab, oklch(0.74 0.16 78) 32%, transparent);
		font-weight: 600;
	}

	/* ── Cards ── */
	.card {
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		padding: 14px 16px;
	}
	.card-head {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 10px;
	}
	.card-head h2 {
		flex: 1;
		margin: 0;
		font-family: var(--font-mono);
		font-size: 10.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
		font-weight: 600;
	}

	/* ── Health ── */
	.health-line {
		display: flex;
		align-items: baseline;
		gap: 8px;
		flex-wrap: wrap;
	}
	.health-count {
		font-size: 16px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--color-text-primary);
	}
	.health-count.fail {
		color: oklch(0.59 0.2 27);
	}
	.health-meta {
		font-family: var(--font-mono);
		font-size: 11.5px;
		color: var(--color-text-faint);
	}
	.health-line.muted {
		color: var(--color-text-faint);
	}
	.health-build {
		margin-top: 6px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-text-faint);
	}
	.checks {
		margin: 12px 0 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.checks li {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--color-text-primary);
	}
	.check-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: oklch(0.59 0.2 27);
		flex-shrink: 0;
	}
	.check-dot.ok {
		background: oklch(0.62 0.18 145);
	}
	.check-name {
		font-family: var(--font-mono);
		font-size: 12.5px;
	}
	.check-latency {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-text-faint);
	}
	.check-error {
		font-size: 11.5px;
		color: oklch(0.59 0.2 27);
	}

	/* ── Metadata ── */
	.meta {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 8px 14px;
		margin: 0;
		font-size: 13px;
	}
	.meta dt {
		font-family: var(--font-mono);
		font-size: 10.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-faint);
		align-self: center;
	}
	.meta dd {
		margin: 0;
		color: var(--color-text-primary);
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.mono {
		font-family: var(--font-mono);
		font-size: 12px;
	}

	/* ── Buttons ── */
	.actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 44px;
		padding: 0 16px;
		font-size: 14px;
		font-weight: 500;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		background: transparent;
		color: var(--color-text-primary);
		text-decoration: none;
	}
	.btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
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
		background: oklch(0.59 0.2 27);
		border-color: oklch(0.59 0.2 27);
		color: #fff;
		font-weight: 600;
	}
	.icon-btn {
		display: inline-grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-subtle);
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.icon-btn:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	:global(.icon-btn .spin) {
		animation: spin 0.6s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
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
</style>
