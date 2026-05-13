<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { ChevronLeft, Activity, FileText, Search, SlidersHorizontal } from 'lucide-svelte';

	let { data } = $props();
	const container = $derived(data.container);

	const name = $derived(page.params.name ?? '');
	let activeTab = $state<'overview' | 'logs'>('overview');

	// ── Overview helpers ──────────────────────────────────────────────────────
	function displayLabel(raw: string) {
		return raw
			.replace(/^\//, '')
			.replace(/^nexo-/, '')
			.replace(/-\d+$/, '')
			.replace(/_/g, ' ');
	}

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

	// ── Logs ─────────────────────────────────────────────────────────────────
	interface LogEntry {
		ts: string;
		level: string;
		service: string;
		msg: string;
		meta: Record<string, unknown>;
		raw: string;
		structured: boolean;
	}

	let lines = $state<LogEntry[]>([]);
	let logBox = $state<HTMLElement | null>(null);
	let es: EventSource | null = null;
	let autoScroll = $state(true);
	let logFilter = $state<'all' | 'info' | 'warn' | 'error'>('all');
	let search = $state('');
	let viewMode = $state<'structured' | 'raw'>('structured');
	let visibleFields = $state({ ts: true, level: true, service: true, meta: true });
	let fieldPickerOpen = $state(false);

	function parseLine(raw: string): LogEntry {
		try {
			const obj = JSON.parse(raw) as Record<string, unknown>;
			if (obj.level && obj.msg) {
				const { level, ts, service, msg, ...rest } = obj as {
					level: string;
					ts: string;
					service: string;
					msg: string;
					[k: string]: unknown;
				};
				return {
					ts: ts ?? '',
					level: level ?? 'info',
					service: service ?? '',
					msg: msg ?? '',
					meta: rest,
					raw,
					structured: true
				};
			}
		} catch {
			/* not JSON */
		}
		const tsMatch = /^(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\s+(.*)$/.exec(raw);
		return {
			ts: tsMatch?.[1] ?? '',
			level: raw.toLowerCase().includes('error')
				? 'error'
				: raw.toLowerCase().includes('warn')
					? 'warn'
					: 'info',
			service: '',
			msg: tsMatch?.[2] ?? raw,
			meta: {},
			raw,
			structured: false
		};
	}

	function shortTs(iso: string) {
		if (!iso) return '';
		try {
			return new Date(iso).toLocaleTimeString('en-GB', {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
		} catch {
			return iso.slice(11, 19);
		}
	}

	function formatMeta(meta: Record<string, unknown>): string {
		return Object.entries(meta)
			.map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
			.join(' · ');
	}

	function connect() {
		es?.close();
		es = new EventSource(`/services/${name}/logs`);
		es.onmessage = (e: MessageEvent) => {
			const entry = parseLine(JSON.parse(e.data as string) as string);
			lines.push(entry);
			if (lines.length > 2000) lines = lines.slice(-2000);
			if (autoScroll && logBox) logBox.scrollTop = logBox.scrollHeight;
		};
		es.onerror = () => es?.close();
	}

	const filteredLines = $derived(
		lines.filter(
			(l) =>
				(logFilter === 'all' || l.level === logFilter) &&
				(!search || l.raw.toLowerCase().includes(search.toLowerCase()))
		)
	);

	onMount(() => connect());
	onDestroy(() => es?.close());

	function onLogScroll() {
		if (!logBox) return;
		autoScroll = logBox.scrollHeight - logBox.scrollTop - logBox.clientHeight < 40;
	}
</script>

<div class="page">
	<!-- Header -->
	<div class="page-header">
		<a href="/services" class="back-link">
			<ChevronLeft size={13} />
			Services
		</a>
		<div class="title-row">
			<h1 class="page-title">{displayLabel(name)}</h1>
			{#if container.State.Running}
				<span class="state-badge running">Running</span>
			{:else}
				<span class="state-badge stopped">{container.State.Status}</span>
			{/if}
			{#if healthStatus}
				<span class="state-badge health-{healthStatus}">{healthStatus}</span>
			{/if}
		</div>
		<p class="page-sub">{imageShort}</p>
	</div>

	<!-- Tabs -->
	<div class="tabs">
		<button
			type="button"
			class="tab {activeTab === 'overview' ? 'active' : ''}"
			onclick={() => (activeTab = 'overview')}
		>
			<Activity size={13} />
			Overview
		</button>
		<button
			type="button"
			class="tab {activeTab === 'logs' ? 'active' : ''}"
			onclick={() => (activeTab = 'logs')}
		>
			<FileText size={13} />
			Logs
		</button>
	</div>

	<!-- Overview -->
	{#if activeTab === 'overview'}
		<div class="overview">
			<div class="stat-grid">
				<div class="stat-card">
					<span class="stat-label">Status</span>
					<span class="stat-value capitalize">{container.State.Status}</span>
				</div>
				<div class="stat-card">
					<span class="stat-label">Uptime</span>
					<span class="stat-value">{uptime(container.State.StartedAt)}</span>
				</div>
				<div class="stat-card">
					<span class="stat-label">Restarts</span>
					<span class="stat-value {container.RestartCount > 0 ? 'warn-val' : ''}"
						>{container.RestartCount}</span
					>
				</div>
				{#if healthStatus}
					<div class="stat-card">
						<span class="stat-label">Health</span>
						<span class="stat-value health-{healthStatus}">{healthStatus}</span>
					</div>
				{/if}
			</div>

			<div class="info-section">
				<span class="info-section-label">Container</span>
				<div class="info-rows">
					<div class="info-row">
						<span class="info-key">Image</span>
						<span class="info-val mono">{container.Config.Image}</span>
					</div>
					<div class="info-row">
						<span class="info-key">ID</span>
						<span class="info-val mono">{container.Id.slice(0, 12)}</span>
					</div>
					<div class="info-row">
						<span class="info-key">Created</span>
						<span class="info-val">{formatDate(container.Created)}</span>
					</div>
					<div class="info-row">
						<span class="info-key">Started</span>
						<span class="info-val">{formatDate(container.State.StartedAt)}</span>
					</div>
					{#if !container.State.Running}
						<div class="info-row">
							<span class="info-key">Stopped</span>
							<span class="info-val">{formatDate(container.State.FinishedAt)}</span>
						</div>
						<div class="info-row">
							<span class="info-key">Exit code</span>
							<span class="info-val mono {container.State.ExitCode !== 0 ? 'warn-val' : ''}"
								>{container.State.ExitCode}</span
							>
						</div>
					{/if}
					<div class="info-row">
						<span class="info-key">Restart policy</span>
						<span class="info-val mono">{restartPolicy}</span>
					</div>
					<div class="info-row">
						<span class="info-key">Networks</span>
						<span class="info-val mono">{networks.join(', ')}</span>
					</div>
				</div>
			</div>

			{#if healthStatus && container.State.Health}
				<div class="info-section">
					<span class="info-section-label">Health checks</span>
					<div class="health-log">
						{#each container.State.Health.Log.slice().reverse() as entry (entry.Start)}
							<div class="health-entry {entry.ExitCode === 0 ? 'ok' : 'fail'}">
								<span class="health-time">{shortTs(entry.Start)}</span>
								<span class="health-code">{entry.ExitCode === 0 ? '✓' : '✗'}</span>
								<span class="health-out">{entry.Output.trim() || '—'}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Logs -->
	{#if activeTab === 'logs'}
		<div class="logs-panel">
			<div class="log-toolbar">
				<div class="log-filters">
					{#each ['all', 'info', 'warn', 'error'] as const as f (f)}
						<button
							type="button"
							class="filter-btn {logFilter === f ? 'active' : ''} filter-{f}"
							onclick={() => (logFilter = f)}>{f}</button
						>
					{/each}
				</div>

				<div class="log-search">
					<Search size={11} strokeWidth={2.5} />
					<input type="text" bind:value={search} placeholder="Search logs…" class="search-input" />
				</div>

				<div class="log-toolbar-right">
					{#if viewMode === 'structured'}
						<div class="field-picker-wrap">
							<button
								type="button"
								class="toolbar-btn {fieldPickerOpen ? 'active' : ''}"
								onclick={() => (fieldPickerOpen = !fieldPickerOpen)}
							>
								<SlidersHorizontal size={11} strokeWidth={2.5} />
								Fields
							</button>
							{#if fieldPickerOpen}
								<div class="field-picker-panel">
									<label class="field-toggle">
										<input type="checkbox" bind:checked={visibleFields.ts} />
										Timestamp
									</label>
									<label class="field-toggle">
										<input type="checkbox" bind:checked={visibleFields.level} />
										Level
									</label>
									<label class="field-toggle">
										<input type="checkbox" bind:checked={visibleFields.service} />
										Service
									</label>
									<label class="field-toggle">
										<input type="checkbox" bind:checked={visibleFields.meta} />
										Meta
									</label>
								</div>
							{/if}
						</div>
					{/if}

					<div class="view-toggle">
						<button
							type="button"
							class="view-btn {viewMode === 'structured' ? 'active' : ''}"
							onclick={() => (viewMode = 'structured')}>Structured</button
						>
						<button
							type="button"
							class="view-btn {viewMode === 'raw' ? 'active' : ''}"
							onclick={() => (viewMode = 'raw')}>Raw</button
						>
					</div>

					<span class="log-count">{filteredLines.length} lines</span>
				</div>
			</div>

			<div class="log-box {viewMode}" bind:this={logBox} onscroll={onLogScroll}>
				{#if filteredLines.length === 0}
					<div class="log-empty">
						{search ? 'No lines match your search.' : 'Waiting for logs…'}
					</div>
				{/if}
				{#each filteredLines as entry, i (i)}
					<div class="log-entry level-{entry.level}">
						{#if viewMode === 'raw'}
							<span class="log-line-num">{i + 1}</span>
							<span class="log-msg raw">{entry.raw}</span>
						{:else}
							<div class="log-header-row">
								{#if visibleFields.ts}
									<span class="log-ts">{shortTs(entry.ts)}</span>
								{/if}
								{#if entry.structured}
									{#if visibleFields.level}
										<span class="log-level">{entry.level}</span>
									{/if}
									{#if visibleFields.service && entry.service}
										<span class="log-service">{entry.service}</span>
									{/if}
								{/if}
							</div>
							{#if entry.structured}
								<span class="log-msg">{entry.msg}</span>
								{#if visibleFields.meta && Object.keys(entry.meta).length > 0}
									<span class="log-meta">{formatMeta(entry.meta)}</span>
								{/if}
							{:else}
								<span class="log-msg raw">{entry.msg}</span>
							{/if}
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.page {
		max-width: 800px;
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	/* ── Header ── */
	.page-header {
		margin-bottom: 24px;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		font-size: 12px;
		color: var(--color-text-faint);
		text-decoration: none;
		margin-bottom: 10px;
		transition: color var(--duration-fast) var(--ease-out);
	}

	.back-link:hover {
		color: var(--color-text-primary);
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.page-title {
		font-size: var(--text-h2);
		font-weight: 600;
		color: var(--color-text-primary);
		letter-spacing: -0.015em;
		text-transform: capitalize;
	}

	.page-sub {
		font-size: 12px;
		color: var(--color-text-faint);
		font-family: var(--font-mono);
		margin-top: 4px;
	}

	.state-badge {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 3px 8px;
		border-radius: 999px;
	}

	.state-badge.running {
		background: color-mix(in oklab, var(--color-accent) 12%, transparent);
		color: color-mix(in oklab, var(--color-accent) 80%, #000);
	}

	.state-badge.stopped {
		background: var(--color-bg-2);
		color: var(--color-text-faint);
	}

	.state-badge.health-healthy {
		background: color-mix(in oklab, var(--color-accent) 12%, transparent);
		color: color-mix(in oklab, var(--color-accent) 80%, #000);
	}

	.state-badge.health-unhealthy {
		background: color-mix(in oklab, #ef4444 12%, transparent);
		color: #ef4444;
	}

	.state-badge.health-starting {
		background: color-mix(in oklab, #f59e0b 12%, transparent);
		color: #f59e0b;
	}

	/* ── Tabs ── */
	.tabs {
		display: flex;
		gap: 2px;
		border-bottom: 1px solid var(--color-border-subtle);
		margin-bottom: 24px;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-subtle);
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		cursor: pointer;
		transition: color var(--duration-fast) var(--ease-out);
	}

	.tab:hover {
		color: var(--color-text-primary);
	}

	.tab.active {
		color: var(--color-accent);
		border-bottom-color: var(--color-accent);
	}

	/* ── Overview ── */
	.overview {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.stat-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 8px;
	}

	.stat-card {
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.stat-label {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--color-text-faint);
		font-family: var(--font-mono);
	}

	.stat-value {
		font-size: 22px;
		font-weight: 600;
		color: var(--color-text-primary);
		letter-spacing: -0.02em;
		line-height: 1.1;
	}

	.stat-value.capitalize {
		text-transform: capitalize;
	}
	.stat-value.warn-val {
		color: #f59e0b;
	}
	.stat-value.health-healthy {
		color: color-mix(in oklab, var(--color-accent) 80%, #000);
	}
	.stat-value.health-unhealthy {
		color: #ef4444;
	}
	.stat-value.health-starting {
		color: #f59e0b;
	}

	/* Info section */
	.info-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.info-section-label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-faint);
		font-family: var(--font-mono);
	}

	.info-rows {
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.info-row {
		display: flex;
		align-items: baseline;
		gap: 16px;
		padding: 10px 16px;
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.info-row:last-child {
		border-bottom: none;
	}

	.info-key {
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-subtle);
		min-width: 110px;
		flex-shrink: 0;
	}

	.info-val {
		font-size: 12px;
		color: var(--color-text-primary);
	}

	.info-val.mono {
		font-family: var(--font-mono);
	}
	.info-val.warn-val {
		color: #f59e0b;
		font-family: var(--font-mono);
	}

	/* Health log */
	.health-log {
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.health-entry {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 8px 16px;
		border-bottom: 1px solid var(--color-border-subtle);
		font-size: 12px;
		font-family: var(--font-mono);
	}

	.health-entry:last-child {
		border-bottom: none;
	}
	.health-entry.ok {
		color: var(--color-text-muted);
	}
	.health-entry.fail {
		color: #ef4444;
	}

	.health-time {
		color: var(--color-text-faint);
		min-width: 64px;
		flex-shrink: 0;
	}
	.health-code {
		min-width: 16px;
		flex-shrink: 0;
	}
	.health-out {
		flex: 1;
	}

	/* ── Logs ── */
	.logs-panel {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.log-toolbar {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.log-filters {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
	}

	.filter-btn {
		font-size: 11px;
		font-weight: 600;
		font-family: var(--font-mono);
		padding: 4px 10px;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
		background: var(--color-surface-1);
		color: var(--color-text-subtle);
		cursor: pointer;
		transition:
			background var(--duration-fast) var(--ease-out),
			color var(--duration-fast) var(--ease-out),
			border-color var(--duration-fast) var(--ease-out);
	}

	.filter-btn:hover {
		color: var(--color-text-primary);
		background: var(--color-bg-1);
	}

	.filter-btn.active.filter-all {
		background: var(--color-bg-2);
		color: var(--color-text-primary);
		border-color: var(--color-border-strong);
	}
	.filter-btn.active.filter-info {
		background: color-mix(in oklab, var(--color-accent) 12%, transparent);
		color: color-mix(in oklab, var(--color-accent) 80%, #000);
		border-color: color-mix(in oklab, var(--color-accent) 30%, transparent);
	}
	.filter-btn.active.filter-warn {
		background: color-mix(in oklab, #f59e0b 12%, transparent);
		color: #b45309;
		border-color: color-mix(in oklab, #f59e0b 30%, transparent);
	}
	.filter-btn.active.filter-error {
		background: color-mix(in oklab, #ef4444 12%, transparent);
		color: #dc2626;
		border-color: color-mix(in oklab, #ef4444 30%, transparent);
	}

	/* Search */
	.log-search {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: 1;
		min-width: 160px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: 4px 10px;
		color: var(--color-text-faint);
		transition: border-color var(--duration-fast) var(--ease-out);
	}

	.log-search:focus-within {
		border-color: var(--color-border-strong);
		color: var(--color-text-subtle);
	}

	.search-input {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		font-size: 12px;
		font-family: var(--font-mono);
		color: var(--color-text-primary);
	}

	.search-input::placeholder {
		color: var(--color-text-faint);
	}

	/* Right side controls */
	.log-toolbar-right {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.toolbar-btn {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
		font-weight: 600;
		font-family: var(--font-mono);
		padding: 4px 10px;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
		background: var(--color-surface-1);
		color: var(--color-text-subtle);
		cursor: pointer;
		transition:
			background var(--duration-fast) var(--ease-out),
			color var(--duration-fast) var(--ease-out),
			border-color var(--duration-fast) var(--ease-out);
	}

	.toolbar-btn:hover,
	.toolbar-btn.active {
		background: var(--color-bg-2);
		color: var(--color-text-primary);
		border-color: var(--color-border-strong);
	}

	/* Field picker dropdown */
	.field-picker-wrap {
		position: relative;
	}

	.field-picker-panel {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		z-index: 50;
		background: var(--color-surface-2, var(--color-bg-1));
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 8px 4px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		min-width: 130px;
	}

	.field-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px;
		font-size: 12px;
		font-family: var(--font-mono);
		color: var(--color-text-subtle);
		cursor: pointer;
		border-radius: var(--radius-md);
		transition:
			background var(--duration-fast) var(--ease-out),
			color var(--duration-fast) var(--ease-out);
	}

	.field-toggle:hover {
		background: var(--color-bg-2);
		color: var(--color-text-primary);
	}

	.field-toggle input[type='checkbox'] {
		accent-color: var(--color-accent);
		width: 13px;
		height: 13px;
		flex-shrink: 0;
	}

	/* View toggle */
	.view-toggle {
		display: flex;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.view-btn {
		font-size: 11px;
		font-weight: 600;
		font-family: var(--font-mono);
		padding: 4px 10px;
		border: none;
		background: var(--color-surface-1);
		color: var(--color-text-subtle);
		cursor: pointer;
		transition:
			background var(--duration-fast) var(--ease-out),
			color var(--duration-fast) var(--ease-out);
	}

	.view-btn + .view-btn {
		border-left: 1px solid var(--color-border-default);
	}

	.view-btn:hover {
		color: var(--color-text-primary);
	}

	.view-btn.active {
		background: var(--color-bg-2);
		color: var(--color-text-primary);
	}

	.log-count {
		font-size: 11px;
		color: var(--color-text-faint);
		font-family: var(--font-mono);
		white-space: nowrap;
	}

	.log-box {
		background: #0d0d0f;
		border: 1px solid #1e1e24;
		border-radius: var(--radius-lg);
		padding: 4px 0;
		overflow-y: auto;
		font-family: var(--font-mono);
		font-size: 12px;
		line-height: 1;
		max-height: calc(100dvh - 320px);
		min-height: 300px;
	}

	.log-empty {
		padding: 20px;
		color: #3f3f46;
	}

	.log-entry {
		display: flex;
		align-items: baseline;
		gap: 0;
		padding: 3px 16px;
		border-bottom: 1px solid transparent;
	}

	.log-entry:hover {
		background: #13131a;
	}

	.log-ts {
		color: #3f3f46;
		min-width: 72px;
		flex-shrink: 0;
		padding-right: 12px;
		font-size: 11px;
	}

	.log-level {
		min-width: 40px;
		flex-shrink: 0;
		font-weight: 700;
		font-size: 10px;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		padding-right: 10px;
	}

	.log-entry.level-info .log-level {
		color: #60a5fa;
	}
	.log-entry.level-warn .log-level {
		color: #fbbf24;
	}
	.log-entry.level-error .log-level {
		color: #f87171;
	}

	.log-service {
		color: #8b5cf6;
		padding-right: 10px;
		min-width: 60px;
		flex-shrink: 0;
	}

	.log-msg {
		color: #e4e4e7;
		flex: 1;
		padding-right: 12px;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.log-msg.raw {
		color: #a1a1aa;
	}
	.log-entry.level-warn .log-msg {
		color: #fde68a;
	}
	.log-entry.level-error .log-msg {
		color: #fca5a5;
	}

	.log-meta {
		color: #52525b;
		font-size: 11px;
		white-space: pre-wrap;
		word-break: break-all;
	}

	/* Line numbers (raw mode) */
	.log-line-num {
		color: #3f3f46;
		min-width: 40px;
		text-align: right;
		flex-shrink: 0;
		padding-right: 14px;
		font-size: 10px;
		line-height: inherit;
		user-select: none;
		border-right: 1px solid #1e1e24;
	}

	/* Separators between entries in raw mode */
	.log-box.raw .log-entry {
		border-bottom: 1px solid #1a1a22;
	}

	/* Desktop: header-row dissolves — children join parent flex row */
	.log-header-row {
		display: contents;
	}

	/* ── Mobile ─────────────────────────────────────────────────────────────── */
	@media (max-width: 640px) {
		.log-entry {
			flex-direction: column;
			align-items: flex-start;
			gap: 3px;
			padding: 8px 12px 8px 14px;
			border-left: 2px solid transparent;
			border-bottom: 1px solid #1a1a22;
		}

		.log-entry.level-info {
			border-left-color: #3b82f6;
		}
		.log-entry.level-warn {
			border-left-color: #f59e0b;
		}
		.log-entry.level-error {
			border-left-color: #ef4444;
		}

		.log-header-row {
			display: flex;
			align-items: center;
			gap: 8px;
			flex-wrap: wrap;
		}

		.log-ts {
			min-width: unset;
			padding-right: 0;
			font-size: 10px;
		}

		.log-level {
			min-width: unset;
			padding-right: 0;
			font-size: 10px;
		}

		.log-service {
			min-width: unset;
			padding-right: 0;
		}

		.log-msg {
			padding-right: 0;
			line-height: 1.5;
		}

		.log-meta {
			line-height: 1.4;
		}

		.log-line-num {
			min-width: 28px;
			font-size: 9px;
		}

		/* Open field picker to the right so it never goes off-screen */
		.field-picker-panel {
			right: auto;
			left: 0;
		}

		/* Allow right-side toolbar controls to start from the left when wrapped */
		.log-toolbar-right {
			width: 100%;
			justify-content: flex-start;
		}
	}
</style>
