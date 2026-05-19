<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { Toast } from '@nexo/ui';
	import { Send, ArrowRight, ChevronRight } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	type Status = 'ok' | 'paused' | 'reconnect' | 'never';

	const status: Status = $derived.by(() => {
		if (!data.account) return 'never';
		if (data.account.needsReconnect) return 'reconnect';
		if (!data.prefs?.enabled) return 'paused';
		return 'ok';
	});

	const statusLabel = $derived(
		status === 'ok'
			? m.home_status_ok()
			: status === 'paused'
				? m.home_status_paused()
				: status === 'reconnect'
					? m.home_status_reconnect()
					: m.home_setup_required()
	);

	const firstName = $derived((data.user?.name ?? '').split(' ')[0] || 'there');
	const initials = $derived(
		(data.user?.name ?? 'U')
			.split(' ')
			.map((w: string) => w[0])
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);
	const todayLabel = $derived(
		new Date().toLocaleDateString('de-DE', {
			weekday: 'long',
			day: '2-digit',
			month: 'short'
		})
	);

	const lastChecked = $derived(formatRelative(data.account?.lastPollAt ?? null));
	const nextCheck = $derived(formatNextCheck(data.account?.lastPollAt ?? null));

	function formatRelative(d: Date | string | null): string | null {
		if (!d) return null;
		const ms = Date.now() - new Date(d).getTime();
		const min = Math.round(ms / 60000);
		if (min < 1) return 'just now';
		if (min < 60) return `${min} min ago`;
		const h = Math.round(min / 60);
		if (h < 24) return `${h} h ago`;
		return `${Math.round(h / 24)} d ago`;
	}

	function formatNextCheck(last: Date | string | null): string | null {
		if (!last) return null;
		const interval = 3 * 60_000;
		const next = new Date(last).getTime() + interval;
		const remaining = next - Date.now();
		if (remaining <= 0) return 'any moment';
		const min = Math.round(remaining / 60_000);
		return min < 1 ? '< 1 min' : `${min} min`;
	}

	function formatOfferDate(iso: string) {
		return new Intl.DateTimeFormat('de-DE', {
			weekday: 'short',
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		}).format(new Date(iso));
	}

	function formatDuration(min: number) {
		const h = Math.floor(min / 60);
		const m2 = min % 60;
		return m2 ? `${h}:${String(m2).padStart(2, '0')}h` : `${h}h`;
	}

	const filterSummary = $derived.by(() => {
		const p = data.prefs;
		if (!p) return null;
		const dayShort = ['', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
		const activeDays = ([1, 2, 3, 4, 5, 6, 7] as const).filter(
			(d) =>
				(p.weeklyWindows[String(d) as '1' | '2' | '3' | '4' | '5' | '6' | '7'] ?? []).length > 0
		);
		const days = activeDays.map((d) => dayShort[d]).join('·');
		const fmt = (mins: number) =>
			`${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
		let time = '—';
		if (activeDays.length > 0) {
			const first =
				p.weeklyWindows[String(activeDays[0]) as '1' | '2' | '3' | '4' | '5' | '6' | '7'];
			const sameShape = activeDays.every(
				(d) =>
					JSON.stringify(p.weeklyWindows[String(d) as '1' | '2' | '3' | '4' | '5' | '6' | '7']) ===
					JSON.stringify(first)
			);
			if (sameShape && first.length === 1) {
				time = `${fmt(first[0].start)}–${fmt(first[0].end)}`;
			} else {
				time = m.settings_schedule_summary_varies();
			}
		}
		const maxH = Math.floor(p.shiftMaxMinutes / 60);
		const maxM = p.shiftMaxMinutes % 60;
		const max = maxM ? `${maxH}:${String(maxM).padStart(2, '0')}h` : `${maxH}h`;
		return { days, time, max };
	});

	let testing = $state(false);
	let toastOpen = $state(false);
	let toastMessage = $state('');
	let toastDetail = $state<string | undefined>(undefined);

	async function sendTest() {
		if (!data.hasDevice || testing) return;
		testing = true;
		try {
			const res = await fetch('/api/push/test', { method: 'POST' });
			if (!res.ok) {
				const body = await res.text().catch(() => '');
				throw new Error(`HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ''}`);
			}
		} catch (e) {
			toastMessage = m.err_test_failed();
			toastDetail = e instanceof Error ? e.message : String(e);
			toastOpen = true;
		} finally {
			testing = false;
		}
	}
</script>

<div class="page">
	<!-- Header: greeting + avatar -->
	<header class="hello">
		<div class="hello-text">
			<div class="hello-greet">Hey, {firstName}</div>
			<div class="hello-date">{todayLabel}</div>
		</div>
		<div class="avatar">{initials}</div>
	</header>

	<!-- Hero status card -->
	<section
		class="hero"
		class:hero-ok={status === 'ok'}
		class:hero-paused={status === 'paused'}
		class:hero-warn={status === 'reconnect'}
		class:hero-never={status === 'never'}
	>
		<div class="hero-wash"></div>

		<div class="hero-top">
			<div class="orb">
				<span class="orb-ring"></span>
				<span class="orb-dot"></span>
			</div>
			<span class="hero-eyebrow t-label">Flaschenpost · Watch</span>
		</div>

		<div class="hero-status">{statusLabel}</div>

		{#if status === 'ok'}
			<div class="hero-grid">
				<div>
					<p class="t-label">{m.home_last_checked()}</p>
					<p class="hero-grid-val">{lastChecked ?? '—'}</p>
				</div>
				<div>
					<p class="t-label">{m.home_next_check()}</p>
					<p class="hero-grid-val">{nextCheck ?? '—'}</p>
				</div>
				<div class="hero-grid-action">
					<button
						type="button"
						class="hero-test"
						disabled={testing || !data.hasDevice}
						onclick={sendTest}
						title={data.hasDevice ? m.home_test_notification() : m.home_no_device()}
					>
						<Send size={15} strokeWidth={1.8} />
					</button>
				</div>
			</div>
		{:else if status === 'never'}
			<a href="/settings?connect=1" class="hero-cta">
				<span>{m.settings_connect()}</span>
				<ArrowRight size={14} strokeWidth={2} />
			</a>
		{:else if status === 'reconnect'}
			<a href="/settings?connect=1" class="hero-cta">
				<span>{m.settings_reconnect()}</span>
				<ArrowRight size={14} strokeWidth={2} />
			</a>
		{:else if status === 'paused'}
			<a href="/settings" class="hero-cta hero-cta-muted">
				<span>{m.home_open_settings()}</span>
				<ArrowRight size={14} strokeWidth={2} />
			</a>
		{/if}
	</section>

	<!-- Active filter -->
	{#if filterSummary && (status === 'ok' || status === 'paused')}
		<div class="set-scope-row">
			<span class="sl-title"><b>{m.home_active_filter()}</b></span>
			<a class="sl-right-link" href="/settings">edit →</a>
		</div>
		<div class="set-card">
			<button type="button" class="set-row filter-row" onclick={() => goto('/settings')}>
				<div class="sr-icon">⏱</div>
				<div class="sr-text">
					<div class="sr-label">{filterSummary.time}</div>
					<div class="sr-desc">{filterSummary.days} · ≤ {filterSummary.max}</div>
				</div>
				<span class="sr-chev">
					<ChevronRight size={16} strokeWidth={1.8} />
				</span>
			</button>
		</div>
	{/if}

	<!-- Recent matches -->
	{#if status === 'ok' || status === 'paused'}
		<div class="set-scope-row">
			<span class="sl-title"><b>{m.home_recent_matches()}</b></span>
			{#if data.recentMatches.length > 0}
				<span class="sl-right">{data.recentMatches.length}</span>
			{/if}
		</div>

		<div class="set-card">
			{#if data.recentMatches.length === 0}
				<div class="empty">
					<div class="empty-emoji">🍾</div>
					<div class="empty-text">{m.home_no_matches()}</div>
				</div>
			{:else}
				{#each data.recentMatches as row (row.id)}
					<div class="set-row match-row">
						<div class="match-when-block">
							<div class="match-when">{formatOfferDate(row.offer.start)}</div>
							<div class="match-meta">
								<span class="mono">{formatDuration(row.offer.durationInMinutes)}</span>
								{#if row.offer.rewardScore > 0}
									<span class="kronkorken" title={m.kronkorken_hint()}>
										{m.kronkorken_label()}
										{row.offer.rewardScore}
									</span>
								{/if}
								{#if row.offer.isMarketplaceShift}
									<span class="pill-marketplace">{m.offer_marketplace()}</span>
								{/if}
							</div>
						</div>
						<div class="match-where">{row.offer.warehouse.name}</div>
					</div>
				{/each}
			{/if}
		</div>
	{/if}

	<!-- Borderline (too long) — collapsed -->
	{#if data.borderlineMatches.length > 0 && (status === 'ok' || status === 'paused')}
		<details class="borderline">
			<summary>
				<div class="borderline-text">
					<div class="borderline-title">{m.home_too_long_title()}</div>
					<div class="borderline-sub">{m.home_too_long_sub()}</div>
				</div>
				<span class="borderline-count">{data.borderlineMatches.length}</span>
			</summary>
			<div class="borderline-list">
				{#each data.borderlineMatches as row (row.id)}
					<div class="set-row match-row borderline-row">
						<div class="match-when-block">
							<div class="match-when">{formatOfferDate(row.offer.start)}</div>
							<div class="match-meta">
								<span class="mono dim">{formatDuration(row.offer.durationInMinutes)}</span>
								{#if row.offer.rewardScore > 0}
									<span class="kronkorken">
										{m.kronkorken_label()}
										{row.offer.rewardScore}
									</span>
								{/if}
								{#if row.offer.isMarketplaceShift}
									<span class="pill-marketplace">{m.offer_marketplace()}</span>
								{/if}
							</div>
						</div>
						<div class="match-where">{row.offer.warehouse.name}</div>
					</div>
				{/each}
			</div>
		</details>
	{/if}
</div>

<Toast bind:open={toastOpen} type="error" message={toastMessage} detail={toastDetail} />

<style>
	.page {
		padding: 4px 0 16px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	/* ─── Greeting header ─── */
	.hello {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 2px 2px;
	}
	.hello-text {
		min-width: 0;
		line-height: 1.15;
	}
	.hello-greet {
		font-size: 22px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
	.hello-date {
		font-size: 12.5px;
		color: var(--color-text-subtle);
		margin-top: 3px;
		font-variant-numeric: tabular-nums;
	}
	.avatar {
		width: 38px;
		height: 38px;
		border-radius: 999px;
		display: grid;
		place-items: center;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: #fff;
		background: linear-gradient(
			135deg,
			var(--color-accent),
			color-mix(in oklab, var(--color-accent) 50%, #000)
		);
		box-shadow:
			0 0 0 2px var(--color-surface-1),
			0 0 0 3px var(--color-border-subtle);
		flex-shrink: 0;
	}

	/* ─── Hero ─── */
	.hero {
		position: relative;
		overflow: hidden;
		padding: 18px;
		border-radius: var(--radius-2xl, 22px);
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
	}
	.hero-wash {
		pointer-events: none;
		position: absolute;
		inset: -40% -10% auto auto;
		width: 70%;
		height: 70%;
		background: radial-gradient(
			circle at 70% 30%,
			color-mix(in oklab, var(--color-accent) 28%, transparent) 0%,
			transparent 70%
		);
		opacity: 0.55;
	}
	.hero-paused .hero-wash {
		background: radial-gradient(
			circle at 70% 30%,
			color-mix(in oklab, var(--warn) 22%, transparent) 0%,
			transparent 70%
		);
	}
	.hero-warn .hero-wash {
		background: radial-gradient(
			circle at 70% 30%,
			color-mix(in oklab, var(--err) 26%, transparent) 0%,
			transparent 70%
		);
	}
	.hero-never .hero-wash {
		opacity: 0.3;
	}

	.hero-top {
		position: relative;
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.hero-eyebrow {
		opacity: 0.85;
	}
	.orb {
		position: relative;
		width: 22px;
		height: 22px;
	}
	.orb-dot {
		position: absolute;
		inset: 7px;
		border-radius: 999px;
		background: var(--color-text-subtle);
	}
	.orb-ring {
		position: absolute;
		inset: 0;
		border-radius: 999px;
		background: var(--color-text-subtle);
		opacity: 0.18;
	}
	.hero-ok .orb-dot {
		background: var(--ok);
		animation: pulse-dot 2.4s ease-in-out infinite;
	}
	.hero-ok .orb-ring {
		background: var(--ok);
		animation: pulse-ring 2.4s ease-out infinite;
	}
	.hero-paused .orb-dot,
	.hero-paused .orb-ring {
		background: var(--warn);
	}
	.hero-warn .orb-dot {
		background: var(--err);
		animation: pulse-dot 1.4s ease-in-out infinite;
	}
	.hero-warn .orb-ring {
		background: var(--err);
	}
	.hero-never .orb-dot,
	.hero-never .orb-ring {
		background: var(--color-text-faint);
	}

	.hero-status {
		position: relative;
		font-size: 26px;
		font-weight: 600;
		letter-spacing: -0.025em;
		margin-top: 14px;
		line-height: 1.2;
	}

	.hero-grid {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr auto;
		align-items: end;
		gap: 14px;
		margin-top: 16px;
	}
	.hero-grid-val {
		font-size: 14px;
		font-weight: 600;
		margin-top: 3px;
		font-variant-numeric: tabular-nums;
		color: var(--color-text);
	}
	.hero-grid-action {
		justify-self: end;
	}
	.hero-test {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--color-accent) 10%, var(--color-surface-1));
		border: 1px solid color-mix(in oklab, var(--color-accent) 30%, var(--color-border-default));
		color: var(--color-accent);
		cursor: pointer;
		transition: background 150ms;
	}
	.hero-test:active:not(:disabled) {
		background: color-mix(in oklab, var(--color-accent) 18%, var(--color-surface-1));
	}
	.hero-test:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.hero-cta {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 14px;
		padding: 8px 14px;
		border-radius: 999px;
		background: var(--color-accent);
		color: #fff;
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
	}
	.hero-cta-muted {
		background: var(--color-bg-1);
		color: var(--color-text);
		border: 1px solid var(--color-border-default);
	}

	/* ─── Section labels (mono uppercase) ─── */
	.set-scope-row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 8px 4px 2px;
		gap: 12px;
	}
	.sl-title {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}
	.sl-title b {
		color: var(--color-text-subtle);
		font-weight: 600;
		letter-spacing: 0.04em;
	}
	.sl-right {
		font-size: 11px;
		font-family: var(--font-mono);
		letter-spacing: 0.06em;
		color: var(--color-text-faint);
	}
	.sl-right-link {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-accent);
		text-decoration: none;
		font-weight: 600;
	}

	/* ─── Filter row ─── */
	.filter-row .sr-icon {
		background: color-mix(in oklab, var(--color-accent) 10%, var(--color-bg-1));
		color: var(--color-accent);
	}

	/* ─── Match rows ─── */
	.match-row {
		align-items: flex-start;
		cursor: default;
	}
	.match-row:active {
		background: transparent;
	}
	.match-when-block {
		flex: 1;
		min-width: 0;
	}
	.match-when {
		font-size: 14px;
		font-weight: 600;
		letter-spacing: -0.005em;
	}
	.match-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-top: 4px;
		font-size: 12px;
		color: var(--color-text-muted);
	}
	.match-where {
		font-size: 12.5px;
		font-weight: 500;
		color: var(--color-text-subtle);
		text-align: right;
		flex-shrink: 0;
	}
	.kronkorken {
		display: inline-flex;
		align-items: center;
		font-size: 10.5px;
		font-weight: 600;
		letter-spacing: 0.04em;
		padding: 2px 7px;
		border-radius: 999px;
		background: var(--color-bg-2);
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}
	.pill-marketplace {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 2px 7px;
		border-radius: 999px;
		background: color-mix(in oklab, var(--color-accent) 14%, transparent);
		color: var(--color-accent);
	}

	.empty {
		padding: 32px 20px;
		text-align: center;
	}
	.empty-emoji {
		font-size: 28px;
		margin-bottom: 8px;
		opacity: 0.7;
	}
	.empty-text {
		font-size: 13px;
		color: var(--color-text-subtle);
		line-height: 1.5;
	}

	/* ─── Borderline (collapsible) ─── */
	.borderline {
		margin-top: 4px;
		border-radius: var(--radius-xl, 18px);
		border: 1px dashed var(--color-border-default);
		background: var(--color-bg-1);
		overflow: hidden;
	}
	.borderline summary {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		cursor: pointer;
		list-style: none;
		user-select: none;
	}
	.borderline summary::-webkit-details-marker {
		display: none;
	}
	.borderline summary::after {
		content: '›';
		font-size: 22px;
		color: var(--color-text-faint);
		margin-left: auto;
		transition: transform 0.18s ease;
	}
	.borderline[open] summary::after {
		transform: rotate(90deg);
	}
	.borderline-text {
		flex: 1;
		min-width: 0;
	}
	.borderline-title {
		font-size: 13.5px;
		font-weight: 600;
		letter-spacing: -0.005em;
	}
	.borderline-sub {
		font-size: 11.5px;
		color: var(--color-text-subtle);
		margin-top: 2px;
		line-height: 1.4;
	}
	.borderline-count {
		font-size: 10.5px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		padding: 2px 8px;
		border-radius: 999px;
		background: var(--color-bg-2);
		color: var(--color-text-muted);
	}
	.borderline-list {
		background: var(--color-surface-1);
		border-top: 1px dashed var(--color-border-default);
	}
	.borderline-row {
		opacity: 0.85;
	}
	.dim {
		color: var(--color-text-subtle);
	}
</style>
