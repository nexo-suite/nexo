<script lang="ts">
	interface HistoryRow {
		checkedAt: Date | string;
		ok: boolean;
		latencyMs: number | null;
	}

	interface Props {
		history: HistoryRow[];
		buckets?: number;
		windowMs?: number;
	}

	let { history, buckets = 48, windowMs = 24 * 60 * 60 * 1000 }: Props = $props();

	type BucketState = 'ok' | 'warn' | 'err' | 'empty';
	interface Bucket {
		state: BucketState;
		total: number;
		passing: number;
	}

	const bucketed = $derived.by(() => {
		const now = Date.now();
		const start = now - windowMs;
		const bucketMs = windowMs / buckets;
		const arr: Bucket[] = Array.from({ length: buckets }, () => ({
			state: 'empty',
			total: 0,
			passing: 0
		}));
		for (const row of history) {
			const t = new Date(row.checkedAt).getTime();
			if (t < start || t > now) continue;
			const idx = Math.min(buckets - 1, Math.max(0, Math.floor((t - start) / bucketMs)));
			arr[idx]!.total += 1;
			if (row.ok) arr[idx]!.passing += 1;
		}
		for (const b of arr) {
			if (b.total === 0) b.state = 'empty';
			else if (b.passing === b.total) b.state = 'ok';
			else if (b.passing === 0) b.state = 'err';
			else b.state = 'warn';
		}
		return arr;
	});

	const totals = $derived.by(() => {
		const start = Date.now() - windowMs;
		let total = 0;
		let passing = 0;
		for (const row of history) {
			const t = new Date(row.checkedAt).getTime();
			if (t < start) continue;
			total += 1;
			if (row.ok) passing += 1;
		}
		return { total, passing };
	});

	const uptimePct = $derived(
		totals.total > 0 ? Math.round((totals.passing / totals.total) * 1000) / 10 : null
	);

	const fmtBucketTitle = (i: number, b: Bucket) => {
		const start = Date.now() - windowMs;
		const bucketMs = windowMs / buckets;
		const t0 = new Date(start + i * bucketMs);
		const label = t0.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
		if (b.total === 0) return `${label} · no checks`;
		return `${label} · ${b.passing}/${b.total} passing`;
	};
</script>

<div class="uptime">
	<div class="uptime-h">
		<div class="uptime-label">Uptime</div>
		{#if uptimePct === null}
			<div class="uptime-pct mute">no data</div>
		{:else}
			<div class="uptime-pct">{uptimePct}% <span class="mute">over 24h</span></div>
		{/if}
	</div>
	<div class="uptime-bars" role="img" aria-label="24-hour uptime sparkline">
		{#each bucketed as b, i (i)}
			<span class="bar {b.state}" title={fmtBucketTitle(i, b)}></span>
		{/each}
	</div>
	<div class="uptime-axis">
		<span>24h ago</span>
		<span>now</span>
	</div>
</div>

<style>
	.uptime {
		margin-top: 14px;
		padding: 12px 14px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		box-sizing: border-box;
		max-width: 100%;
		overflow: hidden;
	}
	.uptime-h {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 8px;
	}
	.uptime-label {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}
	.uptime-pct {
		font-size: 13px;
		font-weight: 600;
	}
	.uptime-pct .mute {
		font-weight: 400;
		color: var(--color-text-faint);
	}
	.uptime-pct.mute {
		color: var(--color-text-faint);
		font-weight: 400;
	}
	.uptime-bars {
		display: flex;
		gap: 2px;
		height: 22px;
		align-items: stretch;
		min-width: 0;
		width: 100%;
	}
	.bar {
		flex: 1 1 0;
		min-width: 0;
		border-radius: 2px;
		background: var(--color-bg-2);
	}
	.bar.ok {
		background: var(--accent-ink);
		opacity: 0.85;
	}
	.bar.warn {
		background: var(--warn-ink);
	}
	.bar.err {
		background: var(--err-ink);
	}
	.uptime-axis {
		display: flex;
		justify-content: space-between;
		margin-top: 6px;
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--color-text-faint);
	}
</style>
