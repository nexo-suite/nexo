<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

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

	type BucketState = 'ok' | 'warn' | 'err' | 'empty' | 'pre';
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
			state: 'empty' as BucketState,
			total: 0,
			passing: 0
		}));
		for (const row of history) {
			const t = new Date(row.checkedAt).getTime();
			if (!Number.isFinite(t) || t < start || t > now) continue;
			const idx = Math.min(buckets - 1, Math.max(0, Math.floor((t - start) / bucketMs)));
			arr[idx]!.total += 1;
			if (row.ok) arr[idx]!.passing += 1;
		}
		const firstWithData = arr.findIndex((b) => b.total > 0);
		for (let i = 0; i < arr.length; i++) {
			const b = arr[i]!;
			if (b.total === 0) {
				b.state = firstWithData === -1 || i < firstWithData ? 'pre' : 'empty';
			} else if (b.passing === b.total) b.state = 'ok';
			else if (b.passing === 0) b.state = 'err';
			else b.state = 'warn';
		}
		return arr;
	});

	const trackingStartIdx = $derived(bucketed.findIndex((b) => b.state !== 'pre'));

	const totals = $derived.by(() => {
		const start = Date.now() - windowMs;
		let total = 0;
		let passing = 0;
		let firstSeen: number | null = null;
		for (const row of history) {
			const t = new Date(row.checkedAt).getTime();
			if (t < start) continue;
			if (firstSeen === null || t < firstSeen) firstSeen = t;
			total += 1;
			if (row.ok) passing += 1;
		}
		return { total, passing, firstSeen };
	});

	const uptimePct = $derived(
		totals.total > 0 ? Math.round((totals.passing / totals.total) * 1000) / 10 : null
	);

	const tone = $derived<'ok' | 'warn' | 'err' | 'mute'>(
		uptimePct === null ? 'mute' : uptimePct >= 99.5 ? 'ok' : uptimePct >= 95 ? 'warn' : 'err'
	);

	// Show "data starts at" hint when window is only partially covered
	const coverageHint = $derived.by(() => {
		if (totals.firstSeen === null) return null;
		const ageMs = Date.now() - totals.firstSeen;
		// Only show if first record is meaningfully inside the window (>30min in)
		if (ageMs > windowMs - 30 * 60 * 1000) return null;
		const hours = Math.floor(ageMs / (60 * 60 * 1000));
		const mins = Math.floor((ageMs % (60 * 60 * 1000)) / (60 * 1000));
		if (hours === 0) return m.services_uptime_tracking_minutes({ minutes: mins });
		return m.services_uptime_tracking_hours({ hours, minutes: mins });
	});

	const fmtBucketTitle = (i: number, b: Bucket) => {
		const start = Date.now() - windowMs;
		const bucketMs = windowMs / buckets;
		const t0 = new Date(start + i * bucketMs);
		const label = t0.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
		if (b.state === 'pre') return `${label} · before tracking`;
		if (b.total === 0) return m.services_uptime_bucket_no_checks({ label });
		return m.services_uptime_bucket_passing({ label, passing: b.passing, total: b.total });
	};
</script>

<div class="uptime">
	<div class="uptime-h">
		<div class="uptime-label">{m.services_uptime_label_24h()}</div>
		{#if totals.total > 0}
			<div class="uptime-checks">
				{m.services_uptime_checks({ passing: totals.passing, total: totals.total })}
			</div>
		{/if}
	</div>

	{#if uptimePct === null}
		<div class="uptime-empty">
			<div class="uptime-empty-em">▁</div>
			<div class="uptime-empty-msg">{m.services_uptime_empty_msg()}</div>
			<div class="uptime-empty-hint">{m.services_uptime_empty_hint()}</div>
		</div>
	{:else}
		<div class="uptime-pct {tone}">
			{uptimePct}<span class="uptime-pct-unit">%</span>
		</div>

		<div class="uptime-bars" role="img" aria-label={m.services_uptime_aria()}>
			{#each bucketed as b, i (i)}
				<span
					class="bar {b.state}"
					class:tracking-start={i === trackingStartIdx && trackingStartIdx > 0}
					title={fmtBucketTitle(i, b)}
				></span>
			{/each}
		</div>
		<div class="uptime-axis">
			<span>{m.services_uptime_axis_24h()}</span>
			<span class="uptime-axis-mid">{m.services_uptime_axis_12h()}</span>
			<span>{m.services_uptime_axis_now()}</span>
		</div>

		{#if coverageHint}
			<div class="uptime-coverage">{coverageHint}</div>
		{/if}
	{/if}
</div>

<style>
	.uptime {
		margin-top: 14px;
		padding: 14px;
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
		margin-bottom: 4px;
	}
	.uptime-label {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}
	.uptime-checks {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-text-subtle);
	}

	.uptime-pct {
		font-size: 28px;
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.1;
		margin: 2px 0 12px;
		font-variant-numeric: tabular-nums;
	}
	.uptime-pct.ok {
		color: var(--accent-ink);
	}
	.uptime-pct.warn {
		color: var(--warn-ink);
	}
	.uptime-pct.err {
		color: var(--err-ink);
	}
	.uptime-pct.mute {
		color: var(--color-text-faint);
	}
	.uptime-pct-unit {
		font-size: 18px;
		opacity: 0.7;
		margin-left: 1px;
	}

	.uptime-bars {
		display: flex;
		gap: 2px;
		height: 26px;
		align-items: stretch;
		min-width: 0;
		width: 100%;
		position: relative;
	}
	.bar {
		flex: 1 1 0;
		min-width: 0;
		border-radius: 2px;
		background: var(--color-bg-2);
		/* dotted hint for empty buckets so they aren't invisible */
		background-image: linear-gradient(
			to bottom,
			transparent 0,
			transparent 11px,
			color-mix(in oklab, var(--color-border-default) 80%, transparent) 11px,
			color-mix(in oklab, var(--color-border-default) 80%, transparent) 13px,
			transparent 13px
		);
		position: relative;
	}
	.bar.pre {
		background: transparent;
		background-image: none;
		border-radius: 0;
		/* thin baseline so the timeline still reads as continuous */
		box-shadow: inset 0 -1px 0 var(--color-border-subtle);
	}
	.bar.tracking-start {
		/* a subtle 'tracking begins here' tick on the first real bucket */
		box-shadow: inset 1px 0 0 color-mix(in oklab, var(--color-accent) 60%, transparent);
	}
	.bar.ok {
		background: var(--accent-ink);
		background-image: none;
		opacity: 0.85;
	}
	.bar.warn {
		background: var(--warn-ink);
		background-image: none;
	}
	.bar.err {
		background: var(--err-ink);
		background-image: none;
	}

	.uptime-axis {
		display: flex;
		justify-content: space-between;
		margin-top: 6px;
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--color-text-faint);
	}
	.uptime-axis-mid {
		opacity: 0.7;
	}

	.uptime-coverage {
		margin-top: 8px;
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--color-text-faint);
		font-style: italic;
	}

	.uptime-empty {
		text-align: center;
		padding: 16px 8px 8px;
		color: var(--color-text-subtle);
	}
	.uptime-empty-em {
		font-size: 28px;
		opacity: 0.35;
		line-height: 1;
		font-family: var(--font-mono);
	}
	.uptime-empty-msg {
		margin-top: 6px;
		font-size: 13px;
	}
	.uptime-empty-hint {
		margin-top: 2px;
		font-size: 11px;
		color: var(--color-text-faint);
	}
</style>
