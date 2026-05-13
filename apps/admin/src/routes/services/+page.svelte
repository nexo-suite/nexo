<script lang="ts">
	import type { ContainerInfo } from '$lib/server/docker';
	import { Activity, Database, ChevronRight, Users, TrendingUp, TrendingDown } from 'lucide-svelte';

	let { data } = $props();

	function containerName(c: ContainerInfo): string {
		return (c.Names[0] ?? c.Id).replace(/^\//, '');
	}

	function isPreview(c: ContainerInfo): boolean {
		const n = containerName(c);
		return n.includes('_preview') || n.includes('preview');
	}

	function serviceLabel(c: ContainerInfo): string {
		return containerName(c)
			.replace(/^nexo-/, '')
			.replace(/-\d+$/, '')
			.replace(/_preview$/, '')
			.replace(/_/g, ' ');
	}

	function serviceMonogram(c: ContainerInfo): string {
		return serviceLabel(c).slice(0, 2).toUpperCase();
	}

	function uptimeLabel(c: ContainerInfo): string {
		if (c.State !== 'running') return 'Stopped';
		return c.Status.replace(/^Up\s+/i, '');
	}

	const production = $derived(data.containers.filter((c) => !isPreview(c)));
	const preview = $derived(data.containers.filter((c) => isPreview(c)));
	const totalRunning = $derived(data.containers.filter((c) => c.State === 'running').length);
	const totalContainers = $derived(data.containers.length);

	const totals = $derived(data.dbStats.totals);
	const activity = $derived(data.dbStats.activity);

	// Activity rows: each entity with today/week/month counts
	const activityRows = $derived([
		{ label: 'New users', icon: Users, ...activity.users },
		{ label: 'Expenses added', icon: TrendingDown, ...activity.expenses },
		{ label: 'Income added', icon: TrendingUp, ...activity.income }
	]);

	// Bar height for sparkline — scale relative to month max
	function barHeight(val: number, max: number): number {
		if (max === 0) return 0;
		return Math.max(3, Math.round((val / max) * 28));
	}
</script>

<div class="page">
	<div class="page-header">
		<div class="header-top">
			<h1 class="page-title">Services</h1>
			{#if totalContainers > 0}
				<div class="header-badge">
					<span class="status-dot {totalRunning === totalContainers ? 'all-up' : 'partial'}"></span>
					{totalRunning}/{totalContainers} running
				</div>
			{/if}
		</div>
	</div>

	<!-- Containers -->
	<section class="section">
		<span class="section-label">01 — Production</span>
		<div class="container-list">
			{#each production as c (c.Id)}
				<a href="/services/{containerName(c)}" class="container-row">
					<div class="row-icon">
						<span class="row-monogram">{serviceMonogram(c)}</span>
					</div>
					<div class="row-body">
						<span class="row-name">{serviceLabel(c)}</span>
						<span class="row-image">{c.Image.split('/').pop()?.split(':')[0]}</span>
					</div>
					<div class="row-right">
						<span class="uptime-text">{uptimeLabel(c)}</span>
						<span class="state-dot {c.State === 'running' ? 'up' : 'down'}"></span>
					</div>
					<ChevronRight size={13} class="row-chevron" />
				</a>
			{/each}
			{#if production.length === 0}
				<div class="empty-row">
					<Activity size={16} />
					No containers found — is the Docker socket mounted?
				</div>
			{/if}
		</div>
	</section>

	{#if preview.length > 0}
		<section class="section">
			<span class="section-label">02 — Preview</span>
			<div class="container-list">
				{#each preview as c (c.Id)}
					<a href="/services/{containerName(c)}" class="container-row preview">
						<div class="row-icon preview">
							<span class="row-monogram">{serviceMonogram(c)}</span>
						</div>
						<div class="row-body">
							<span class="row-name">{serviceLabel(c)}</span>
							<span class="row-image">{c.Image.split('/').pop()?.split(':')[0]}</span>
						</div>
						<div class="row-right">
							<span class="uptime-text">{uptimeLabel(c)}</span>
							<span class="state-dot {c.State === 'running' ? 'up' : 'down'}"></span>
						</div>
						<ChevronRight size={13} class="row-chevron" />
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Database totals -->
	<section class="section">
		<span class="section-label">{preview.length > 0 ? '03' : '02'} — Database</span>
		<div class="totals-strip">
			<div class="totals-icon">
				<Database size={15} />
			</div>
			<div class="totals-row">
				<div class="total-item">
					<span class="total-val">{totals.users}</span>
					<span class="total-lbl">users</span>
				</div>
				<div class="total-sep"></div>
				<div class="total-item">
					<span class="total-val">{totals.accounts}</span>
					<span class="total-lbl">accounts</span>
				</div>
				<div class="total-sep"></div>
				<div class="total-item">
					<span class="total-val">{totals.expenses}</span>
					<span class="total-lbl">expenses</span>
				</div>
				<div class="total-sep"></div>
				<div class="total-item">
					<span class="total-val">{totals.income}</span>
					<span class="total-lbl">income</span>
				</div>
				<div class="total-sep"></div>
				<div class="total-item">
					<span class="total-val">{totals.debts}</span>
					<span class="total-lbl">debts</span>
				</div>
			</div>
		</div>
	</section>

	<!-- Activity -->
	<section class="section">
		<span class="section-label">{preview.length > 0 ? '04' : '03'} — Activity</span>
		<div class="activity-grid">
			{#each activityRows as row (row.label)}
				{@const maxVal = Math.max(row.month, 1)}
				<div class="activity-card">
					<div class="activity-header">
						<div class="activity-icon">
							<row.icon size={14} />
						</div>
						<span class="activity-label">{row.label}</span>
					</div>

					<!-- Mini bar chart: today / week / month -->
					<div class="spark-wrap">
						<div class="spark-bars">
							<div class="spark-bar-group">
								<div
									class="spark-bar accent"
									style="height: {barHeight(row.today, maxVal)}px"
								></div>
								<div class="spark-bar mid" style="height: {barHeight(row.week, maxVal)}px"></div>
								<div class="spark-bar base" style="height: {barHeight(row.month, maxVal)}px"></div>
							</div>
						</div>
						<div class="spark-legend">
							<span class="spark-dot accent-dot"></span><span>today</span>
							<span class="spark-dot mid-dot"></span><span>week</span>
							<span class="spark-dot base-dot"></span><span>month</span>
						</div>
					</div>

					<div class="activity-counts">
						<div class="activity-count">
							<span class="count-val accent-val">{row.today}</span>
							<span class="count-lbl">today</span>
						</div>
						<div class="activity-count">
							<span class="count-val">{row.week}</span>
							<span class="count-lbl">this week</span>
						</div>
						<div class="activity-count">
							<span class="count-val">{row.month}</span>
							<span class="count-lbl">this month</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</section>
</div>

<style>
	.page {
		max-width: 800px;
	}

	/* ── Header ── */
	.page-header {
		margin-bottom: 40px;
	}

	.header-top {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.page-title {
		font-size: var(--text-h1);
		font-weight: 600;
		color: var(--color-text-primary);
		letter-spacing: -0.025em;
		line-height: 1.05;
	}

	.header-badge {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: var(--color-text-subtle);
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-subtle);
		border-radius: 999px;
		padding: 3px 10px 3px 8px;
	}

	.status-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.status-dot.all-up {
		background: var(--color-accent);
		box-shadow: 0 0 0 2px color-mix(in oklab, var(--color-accent) 25%, transparent);
	}

	.status-dot.partial {
		background: #f59e0b;
		box-shadow: 0 0 0 2px color-mix(in oklab, #f59e0b 25%, transparent);
	}

	/* ── Sections ── */
	.section {
		margin-bottom: 32px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.section-label {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-faint);
		font-family: var(--font-mono);
	}

	/* ── Container list ── */
	.container-list {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.container-row {
		display: flex;
		align-items: center;
		gap: 12px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 12px 14px;
		text-decoration: none;
		transition:
			background var(--duration-fast) var(--ease-out),
			border-color var(--duration-fast) var(--ease-out),
			transform var(--duration-base) var(--ease-out);
	}

	.container-row:hover {
		background: var(--color-surface-2);
		border-color: color-mix(in oklab, var(--color-accent) 35%, var(--color-border-default));
		transform: translateX(2px);
	}

	.row-icon {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		background: color-mix(in oklab, var(--color-accent) 10%, var(--color-bg-0));
		border: 1px solid color-mix(in oklab, var(--color-accent) 22%, transparent);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.row-icon.preview {
		background: var(--color-bg-1);
		border-color: var(--color-border-subtle);
	}

	.row-monogram {
		font-family: var(--font-mono);
		font-size: 10px;
		font-weight: 700;
		color: var(--color-accent);
		letter-spacing: 0.03em;
	}

	.row-icon.preview .row-monogram {
		color: var(--color-text-subtle);
	}

	.row-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.row-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--color-text-primary);
		text-transform: capitalize;
	}

	.row-image {
		font-size: 11px;
		color: var(--color-text-faint);
		font-family: var(--font-mono);
	}

	.row-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 3px;
		flex-shrink: 0;
	}

	.uptime-text {
		font-size: 11px;
		color: var(--color-text-faint);
		white-space: nowrap;
	}

	.state-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}

	.state-dot.up {
		background: var(--color-accent);
	}

	.state-dot.down {
		background: var(--color-text-faint);
	}

	:global(.row-chevron) {
		color: var(--color-border-strong);
		flex-shrink: 0;
		transition: color var(--duration-fast) var(--ease-out);
	}

	.container-row:hover :global(.row-chevron) {
		color: var(--color-accent);
	}

	.empty-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 16px;
		background: var(--color-bg-1);
		border: 1px dashed var(--color-border-default);
		border-radius: var(--radius-lg);
		font-size: 13px;
		color: var(--color-text-subtle);
	}

	/* ── Totals strip ── */
	.totals-strip {
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 16px 20px;
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.totals-icon {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-sm);
		background: color-mix(in oklab, var(--color-accent) 10%, var(--color-bg-0));
		border: 1px solid color-mix(in oklab, var(--color-accent) 22%, transparent);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: var(--color-accent);
	}

	.totals-row {
		display: flex;
		align-items: center;
		flex: 1;
		flex-wrap: wrap;
		gap: 0;
	}

	.total-item {
		display: flex;
		flex-direction: column;
		gap: 1px;
		padding: 0 16px;
	}

	.total-item:first-child {
		padding-left: 0;
	}

	.total-val {
		font-size: 18px;
		font-weight: 600;
		color: var(--color-text-primary);
		letter-spacing: -0.02em;
		line-height: 1;
	}

	.total-lbl {
		font-size: 10px;
		color: var(--color-text-faint);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-family: var(--font-mono);
	}

	.total-sep {
		width: 1px;
		height: 24px;
		background: var(--color-border-subtle);
		flex-shrink: 0;
	}

	/* ── Activity grid ── */
	.activity-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	.activity-card {
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: 18px 18px 14px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.activity-header {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.activity-icon {
		width: 26px;
		height: 26px;
		border-radius: var(--radius-sm);
		background: color-mix(in oklab, var(--color-accent) 10%, var(--color-bg-0));
		border: 1px solid color-mix(in oklab, var(--color-accent) 20%, transparent);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: var(--color-accent);
	}

	.activity-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-primary);
	}

	/* Mini bar chart */
	.spark-wrap {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.spark-bars {
		height: 32px;
		display: flex;
		align-items: flex-end;
	}

	.spark-bar-group {
		display: flex;
		align-items: flex-end;
		gap: 4px;
	}

	.spark-bar {
		width: 10px;
		border-radius: 3px 3px 0 0;
		transition: height 0.4s var(--ease-out);
	}

	.spark-bar.accent {
		background: var(--color-accent);
	}

	.spark-bar.mid {
		background: color-mix(in oklab, var(--color-accent) 50%, var(--color-bg-2));
	}

	.spark-bar.base {
		background: var(--color-bg-2);
	}

	.spark-legend {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 10px;
		color: var(--color-text-faint);
	}

	.spark-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.spark-dot.accent-dot {
		background: var(--color-accent);
	}

	.spark-dot.mid-dot {
		background: color-mix(in oklab, var(--color-accent) 50%, var(--color-bg-2));
	}

	.spark-dot.base-dot {
		background: var(--color-bg-2);
	}

	/* Count row */
	.activity-counts {
		display: flex;
		gap: 0;
		border-top: 1px solid var(--color-border-subtle);
		padding-top: 12px;
	}

	.activity-count {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding-right: 8px;
	}

	.count-val {
		font-size: 20px;
		font-weight: 600;
		color: var(--color-text-primary);
		letter-spacing: -0.02em;
		line-height: 1;
	}

	.count-val.accent-val {
		color: color-mix(in oklab, var(--color-accent) 85%, #000);
	}

	.count-lbl {
		font-size: 10px;
		color: var(--color-text-faint);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-family: var(--font-mono);
	}

	@media (max-width: 640px) {
		.activity-grid {
			grid-template-columns: 1fr;
		}

		.totals-strip {
			flex-direction: column;
			align-items: flex-start;
		}

		.totals-row {
			gap: 12px;
		}

		.total-sep {
			display: none;
		}

		.total-item {
			padding: 0;
		}
	}
</style>
