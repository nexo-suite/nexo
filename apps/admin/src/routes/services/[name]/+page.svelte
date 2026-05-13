<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
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

	// ── Log types ─────────────────────────────────────────────────────────────
	interface LogEntry {
		ts: string;
		level: string;
		service: string;
		msg: string;
		meta: Record<string, unknown>;
		raw: string;
		structured: boolean;
	}

	// ── Log state ─────────────────────────────────────────────────────────────
	let lines = $state<LogEntry[]>([]);
	let logBox = $state<HTMLElement | null>(null);
	let es: EventSource | null = null;
	let autoScroll = $state(true);
	let logFilter = $state<'all' | 'info' | 'warn' | 'error'>('all');
	let search = $state('');
	let fieldPickerOpen = $state(false);
	let expandedIdx = $state<number | null>(null);
	let copiedIdx = $state<number | null>(null);
	let allMetaKeys = new SvelteSet<string>();
	let visibleColumns = new SvelteSet(['ts', 'level', 'service', 'msg']);

	const FIXED_COLS = ['ts', 'level', 'service', 'msg'];
	const extraColumns = $derived([...visibleColumns].filter((c) => !FIXED_COLS.includes(c)));

	function toggleColumn(key: string) {
		if (visibleColumns.has(key)) {
			visibleColumns.delete(key);
		} else {
			visibleColumns.add(key);
		}
	}

	async function copyRaw(idx: number, raw: string) {
		await navigator.clipboard.writeText(raw);
		copiedIdx = idx;
		setTimeout(() => (copiedIdx = null), 2000);
	}

	// ── Log parsers ───────────────────────────────────────────────────────────
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

	function connect() {
		es?.close();
		es = new EventSource(`/services/${name}/logs`);
		es.onmessage = (e: MessageEvent) => {
			const entry = parseLine(JSON.parse(e.data as string) as string);
			lines.push(entry);
			for (const k of Object.keys(entry.meta)) allMetaKeys.add(k);
			if (lines.length > 2000) {
				lines = lines.slice(-2000);
				const rebuilt = new SvelteSet<string>();
				for (const l of lines) for (const k of Object.keys(l.meta)) rebuilt.add(k);
				allMetaKeys = rebuilt;
			}
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

	function handleRowKey(e: KeyboardEvent, i: number) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			expandedIdx = expandedIdx === i ? null : i;
		}
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
			<!-- Toolbar -->
			<div class="log-toolbar">
				<div class="toolbar-top">
					<div class="log-search">
						<Search size={11} strokeWidth={2.5} />
						<input
							type="text"
							bind:value={search}
							placeholder="Search logs…"
							class="search-input"
						/>
					</div>
					<div class="toolbar-end">
						<div class="field-picker-wrap">
							<button
								type="button"
								class="ctrl-btn {fieldPickerOpen ? 'active' : ''}"
								onclick={() => (fieldPickerOpen = !fieldPickerOpen)}
							>
								<SlidersHorizontal size={11} strokeWidth={2.5} />
								Fields
							</button>
							{#if fieldPickerOpen}
								<div class="field-picker-panel">
									<span class="picker-label">Columns</span>
									{#each FIXED_COLS as key (key)}
										<label class="field-toggle">
											<input
												type="checkbox"
												checked={visibleColumns.has(key)}
												onchange={() => toggleColumn(key)}
											/>
											{key}
										</label>
									{/each}
									{#if allMetaKeys.size > 0}
										<div class="picker-divider"></div>
										<span class="picker-label">Meta</span>
										{#each [...allMetaKeys] as key (key)}
											<label class="field-toggle">
												<input
													type="checkbox"
													checked={visibleColumns.has(key)}
													onchange={() => toggleColumn(key)}
												/>
												{key}
											</label>
										{/each}
									{/if}
								</div>
							{/if}
						</div>
						<span class="log-count">{filteredLines.length} lines</span>
					</div>
				</div>
				<div class="toolbar-bottom">
					{#each ['all', 'info', 'warn', 'error'] as const as f (f)}
						<button
							type="button"
							class="filter-btn {logFilter === f ? 'active' : ''} filter-{f}"
							onclick={() => (logFilter = f)}>{f}</button
						>
					{/each}
				</div>
			</div>

			<!-- Log stream -->
			<div class="log-box" bind:this={logBox} onscroll={onLogScroll}>
				{#if filteredLines.length === 0}
					<div class="log-empty">
						{search ? 'No lines match your search.' : 'Waiting for logs…'}
					</div>
				{/if}
				{#each filteredLines as entry, i (i)}
					<div
						class="log-row level-{entry.level}"
						class:is-expanded={expandedIdx === i}
						onclick={() => (expandedIdx = expandedIdx === i ? null : i)}
						onkeydown={(e) => handleRowKey(e, i)}
						role="button"
						tabindex="0"
					>
						<div class="row-main">
							{#if visibleColumns.has('ts')}
								<span class="col col-ts">{shortTs(entry.ts)}</span>
							{/if}
							{#if visibleColumns.has('level') && entry.structured}
								<span class="col col-level">{entry.level}</span>
							{/if}
							{#if visibleColumns.has('service') && entry.structured && entry.service}
								<span class="col col-service">{entry.service}</span>
							{/if}
							{#if visibleColumns.has('msg')}
								<span class="col col-msg">{entry.msg || entry.raw}</span>
							{/if}
							{#each extraColumns as key (key)}
								<span class="col col-extra" data-key={key}>
									{entry.meta[key] !== undefined ? String(entry.meta[key]) : ''}
								</span>
							{/each}
						</div>
						{#if expandedIdx === i}
							<div class="row-detail">
								<div class="kv-grid">
									{#if entry.ts}
										<span class="kv-key">ts</span>
										<span class="kv-val">{entry.ts}</span>
									{/if}
									{#if entry.structured}
										<span class="kv-key">level</span>
										<span class="kv-val kv-lv-{entry.level}">{entry.level}</span>
										{#if entry.service}
											<span class="kv-key">service</span>
											<span class="kv-val kv-service">{entry.service}</span>
										{/if}
										<span class="kv-key">msg</span>
										<span class="kv-val kv-msg">{entry.msg}</span>
										{#each Object.entries(entry.meta) as [k, v] (k)}
											<span class="kv-key">{k}</span>
											<span class="kv-val"
												>{typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}</span
											>
										{/each}
									{:else}
										<span class="kv-key">raw</span>
										<span class="kv-val">{entry.raw}</span>
									{/if}
								</div>
								<div class="detail-footer">
									<button
										type="button"
										class="copy-raw-btn"
										onclick={(e) => {
											e.stopPropagation();
											copyRaw(i, entry.raw);
										}}
									>
										{copiedIdx === i ? '✓ copied' : 'copy raw'}
									</button>
								</div>
							</div>
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

	/* ── Logs panel ── */
	.logs-panel {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	/* Toolbar */
	.log-toolbar {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.toolbar-top {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.log-search {
		display: flex;
		align-items: center;
		gap: 6px;
		flex: 1;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: 5px 10px;
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

	.toolbar-end {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.toolbar-bottom {
		display: flex;
		gap: 4px;
	}

	/* Filter buttons */
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
		background: color-mix(in oklab, #3b82f6 10%, transparent);
		color: #2563eb;
		border-color: color-mix(in oklab, #3b82f6 25%, transparent);
	}
	.filter-btn.active.filter-warn {
		background: color-mix(in oklab, #f59e0b 10%, transparent);
		color: #b45309;
		border-color: color-mix(in oklab, #f59e0b 25%, transparent);
	}
	.filter-btn.active.filter-error {
		background: color-mix(in oklab, #ef4444 10%, transparent);
		color: #dc2626;
		border-color: color-mix(in oklab, #ef4444 25%, transparent);
	}

	/* Fields button + dropdown */
	.ctrl-btn {
		display: flex;
		align-items: center;
		gap: 5px;
		font-size: 11px;
		font-weight: 600;
		font-family: var(--font-mono);
		padding: 5px 10px;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
		background: var(--color-surface-1);
		color: var(--color-text-subtle);
		cursor: pointer;
		white-space: nowrap;
		transition:
			background var(--duration-fast) var(--ease-out),
			color var(--duration-fast) var(--ease-out),
			border-color var(--duration-fast) var(--ease-out);
	}

	.ctrl-btn:hover,
	.ctrl-btn.active {
		background: var(--color-bg-2);
		color: var(--color-text-primary);
		border-color: var(--color-border-strong);
	}

	.field-picker-wrap {
		position: relative;
	}

	.field-picker-panel {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		z-index: 50;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 6px 4px;
		display: flex;
		flex-direction: column;
		gap: 1px;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.08),
			0 10px 30px -4px rgba(0, 0, 0, 0.12);
		min-width: 140px;
		max-height: 60vh;
		overflow-y: auto;
	}

	.picker-label {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-faint);
		font-family: var(--font-mono);
		padding: 4px 12px 2px;
	}

	.picker-divider {
		height: 1px;
		background: var(--color-border-subtle);
		margin: 4px 8px;
	}

	.field-toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 5px 12px;
		font-size: 12px;
		font-family: var(--font-mono);
		color: var(--color-text-subtle);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition:
			background var(--duration-fast) var(--ease-out),
			color var(--duration-fast) var(--ease-out);
	}

	.field-toggle:hover {
		background: var(--color-bg-1);
		color: var(--color-text-primary);
	}

	.field-toggle input[type='checkbox'] {
		accent-color: var(--color-accent);
		width: 13px;
		height: 13px;
		flex-shrink: 0;
	}

	.log-count {
		font-size: 11px;
		color: var(--color-text-faint);
		font-family: var(--font-mono);
		white-space: nowrap;
	}

	/* ── Log stream box ── */
	.log-box {
		background: #0d0d0f;
		border: 1px solid #1e1e24;
		border-radius: var(--radius-lg);
		overflow-y: auto;
		overscroll-behavior: contain;
		font-family: var(--font-mono);
		font-size: 12px;
		max-height: calc(100dvh - 280px);
		min-height: 300px;
	}

	.log-empty {
		padding: 20px 16px;
		color: #3f3f46;
		font-family: var(--font-mono);
		font-size: 12px;
	}

	/* ── Log rows ── */
	.log-row {
		border-left: 3px solid transparent;
		cursor: pointer;
		outline: none;
	}

	.log-row:hover,
	.log-row.is-expanded {
		background: #111116;
	}

	.log-row:focus-visible {
		outline: 1px solid #3b82f6;
		outline-offset: -1px;
	}

	/* Level left-border color */
	.log-row.level-info {
		border-left-color: #3b82f6;
	}
	.log-row.level-warn {
		border-left-color: #f59e0b;
	}
	.log-row.level-error {
		border-left-color: #ef4444;
	}
	.log-row.level-debug {
		border-left-color: #52525b;
	}

	/* Separator between rows */
	.log-row + .log-row {
		border-top: 1px solid #16161c;
	}

	/* Main collapsed row */
	.row-main {
		display: flex;
		align-items: baseline;
		padding: 4px 12px 4px 10px;
		gap: 0;
		min-width: 0;
	}

	/* Shared column base */
	.col {
		font-family: var(--font-mono);
		font-size: 12px;
		flex-shrink: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.col-ts {
		color: #3f3f46;
		font-size: 11px;
		min-width: 70px;
		padding-right: 12px;
	}

	.col-level {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		min-width: 40px;
		padding-right: 10px;
	}
	.level-info .col-level {
		color: #60a5fa;
	}
	.level-warn .col-level {
		color: #fbbf24;
	}
	.level-error .col-level {
		color: #f87171;
	}
	.level-debug .col-level {
		color: #71717a;
	}

	.col-service {
		color: #a78bfa;
		font-size: 11px;
		min-width: 56px;
		padding-right: 10px;
	}

	.col-msg {
		color: #e4e4e7;
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.level-warn .col-msg {
		color: #fde68a;
	}
	.level-error .col-msg {
		color: #fca5a5;
	}

	/* Extra meta columns: show key= prefix via CSS */
	.col-extra {
		color: #52525b;
		font-size: 11px;
		padding-left: 10px;
		max-width: 180px;
		flex-shrink: 1;
	}
	.col-extra::before {
		content: attr(data-key) '=';
		color: #3f3f46;
	}

	/* ── Expanded detail panel ── */
	.row-detail {
		background: #0a0a0d;
		border-top: 1px solid #1e1e26;
		padding: 10px 12px 10px 13px;
	}

	.kv-grid {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 3px 16px;
		margin-bottom: 10px;
	}

	.kv-key {
		font-family: var(--font-mono);
		font-size: 11px;
		color: #52525b;
		white-space: nowrap;
		align-self: start;
		padding-top: 1px;
		user-select: none;
	}

	.kv-val {
		font-family: var(--font-mono);
		font-size: 12px;
		color: #a1a1aa;
		word-break: break-all;
		white-space: pre-wrap;
		line-height: 1.5;
	}

	/* Highlighted KV values */
	.kv-lv-info {
		color: #60a5fa;
	}
	.kv-lv-warn {
		color: #fbbf24;
	}
	.kv-lv-error {
		color: #f87171;
	}
	.kv-service {
		color: #a78bfa;
	}
	.kv-msg {
		color: #e4e4e7;
	}

	.detail-footer {
		display: flex;
		justify-content: flex-end;
	}

	.copy-raw-btn {
		font-size: 11px;
		font-family: var(--font-mono);
		font-weight: 600;
		padding: 3px 10px;
		border-radius: var(--radius-md);
		border: 1px solid #2a2a34;
		background: transparent;
		color: #52525b;
		cursor: pointer;
		transition:
			color var(--duration-fast) var(--ease-out),
			border-color var(--duration-fast) var(--ease-out);
	}

	.copy-raw-btn:hover {
		color: #a1a1aa;
		border-color: #3f3f4e;
	}

	/* ── Mobile ── */
	@media (max-width: 640px) {
		/* Field picker opens left-anchored (button is on the right edge) */
		.field-picker-panel {
			right: 0;
			max-width: calc(100vw - 32px);
		}

		/* Wrap columns: msg first (full-width), then ts/service/meta on second line */
		.row-main {
			flex-wrap: wrap;
			align-items: flex-start;
			gap: 1px 0;
			padding: 7px 10px 6px 10px;
		}

		/* Message is promoted to its own full-width first line */
		.col-msg {
			order: -1;
			width: 100%;
			flex-basis: 100%;
			overflow: visible;
			text-overflow: unset;
			white-space: pre-wrap;
			word-break: break-word;
			line-height: 1.45;
			padding-bottom: 2px;
		}

		/* Level badge redundant on mobile — left border shows it */
		.col-level {
			display: none;
		}

		/* Smaller secondary items */
		.col-ts {
			font-size: 10px;
			min-width: unset;
			padding-right: 8px;
			color: #2e2e36;
		}

		.col-service {
			font-size: 10px;
			min-width: unset;
			padding-right: 8px;
		}

		.col-extra {
			font-size: 10px;
			max-width: unset;
			padding-left: 8px;
		}
	}
</style>
