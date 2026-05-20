<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { PageHeader } from '@nexo/ui';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import { Plug, Sliders, ChevronRight, XCircle, Hand, Info, CalendarPlus } from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { PlannedShiftPayload } from '$lib/server/flaschenpost';

	let { data }: { data: PageData } = $props();

	const displayName = $derived(data.profile?.displayName || data.user?.name || 'there');

	const statusTone = $derived.by<'ok' | 'warn' | 'err' | 'accent'>(() => {
		if (data.connection === 'reconnect') return 'err';
		if (data.connection === 'never') return 'accent';
		if (data.deviceCount === 0) return 'warn';
		if (!data.pollEnabled) return 'warn';
		return 'ok';
	});

	const statusLabel = $derived.by(() => {
		if (data.connection === 'never') return m.dashboard_status_setup();
		if (data.connection === 'reconnect') return m.dashboard_status_reconnect();
		if (data.deviceCount === 0) return m.dashboard_status_no_devices();
		if (!data.pollEnabled) return m.dashboard_status_paused();
		return m.dashboard_status_ok();
	});

	let now = $state(Date.now());
	onMount(() => {
		const id = setInterval(() => (now = Date.now()), 60_000);
		return () => clearInterval(id);
	});

	const lastCheckedLabel = $derived.by(() => {
		const ts = data.lastPolledAt;
		if (!ts) return null;
		const diffMs = now - new Date(ts).getTime();
		const diffMin = Math.max(0, Math.round(diffMs / 60_000));
		if (diffMin < 1) return m.dashboard_just_now();
		if (diffMin < 60) return m.dashboard_minutes_ago({ n: String(diffMin) });
		const diffHr = Math.round(diffMin / 60);
		return m.dashboard_hours_ago({ n: String(diffHr) });
	});

	function pad2(n: number) {
		return String(n).padStart(2, '0');
	}

	function fmtDuration(minutes: number) {
		const h = Math.floor(minutes / 60);
		const mins = minutes % 60;
		return mins ? `${h}:${pad2(mins)}h` : `${h}h`;
	}

	function fmtTimeRange(start: string, durationInMinutes: number) {
		const d = new Date(start);
		const endD = new Date(d.getTime() + durationInMinutes * 60_000);
		return `${pad2(d.getHours())}:${pad2(d.getMinutes())}–${pad2(endD.getHours())}:${pad2(endD.getMinutes())}`;
	}

	function dowLabel(start: string) {
		const d = new Date(start);
		try {
			return new Intl.DateTimeFormat(getLocale(), { weekday: 'short' })
				.format(d)
				.replace('.', '')
				.toUpperCase();
		} catch {
			return ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()];
		}
	}

	function dayMonth(start: string) {
		const d = new Date(start);
		return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
	}

	function fmtTakenDate(start: string) {
		return dayMonth(start);
	}

	function calendarUrl(shift: PlannedShiftPayload): string {
		const start = new Date(shift.start);
		const end = new Date(start.getTime() + shift.durationInMinutes * 60_000);
		const fmt = (d: Date) => {
			const parts = new Intl.DateTimeFormat('sv-SE', {
				timeZone: 'Europe/Berlin',
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hour12: false
			}).formatToParts(d);
			const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
			return `${get('year')}${get('month')}${get('day')}T${get('hour')}${get('minute')}${get('second')}`;
		};
		const dates = `${fmt(start)}/${fmt(end)}`;
		const title = `${m.dashboard_calendar_event_title()} — ${shift.warehouse.name}`;
		const location = `Flaschenpost ${shift.warehouse.name}`;
		const detailLines = [
			`${shift.warehouse.name} · ${shift.workgroup.name}`,
			`${fmtTimeRange(shift.start, shift.durationInMinutes)} · ${fmtDuration(shift.durationInMinutes)}`
		];
		if (shift.shiftType) detailLines.push(shift.shiftType);
		if (shift.rewardScore > 0) detailLines.push(`🥇 ${shift.rewardScore}`);
		const params = new URLSearchParams({
			action: 'TEMPLATE',
			text: title,
			dates,
			location,
			details: detailLines.join('\n'),
			ctz: 'Europe/Berlin'
		});
		return `https://calendar.google.com/calendar/render?${params.toString()}`;
	}

	function reasonLabel(reason: string): string {
		switch (reason) {
			case 'disabled':
				return m.dashboard_reason_disabled();
			case 'marketplace_excluded':
				return m.dashboard_reason_marketplace_excluded();
			case 'warehouse_excluded':
				return m.dashboard_reason_warehouse_excluded();
			case 'workgroup_excluded':
				return m.dashboard_reason_workgroup_excluded();
			case 'day_unavailable':
				return m.dashboard_reason_day_unavailable();
			case 'override_excludes':
				return m.dashboard_reason_override_excludes();
			case 'outside_window':
				return m.dashboard_reason_outside_window();
			case 'length':
				return m.dashboard_reason_length();
			case 'advance':
				return m.dashboard_reason_advance();
			default:
				return reason;
		}
	}

	let toastMessage = $state<string | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | null = null;
	function flashToast(text: string) {
		toastMessage = text;
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastMessage = null), 2800);
	}
	function onTakeShift() {
		flashToast(m.dashboard_toast_accept_stub());
	}

	let takenDismissed = $state(false);
	const showTaken = $derived(!takenDismissed && data.takenShift !== null);

	let highlightedRow = $state<string | null>(null);
	function highlightFocus(node: HTMLElement, key: string) {
		if (data.focusKey && data.focusKey === key) {
			node.scrollIntoView({ block: 'center', behavior: 'smooth' });
			highlightedRow = key;
			setTimeout(() => {
				if (untrack(() => highlightedRow) === key) highlightedRow = null;
			}, 2200);
		}
	}

	$effect(() => {
		if (page.url.searchParams.has('shift')) {
			const u = new URL(page.url);
			u.searchParams.delete('shift');
			goto(u.pathname + (u.search ? u.search : ''), {
				replaceState: true,
				noScroll: true,
				keepFocus: true
			});
		}
	});

	const isDisconnected = $derived(data.connection !== 'connected');
</script>

<div class="page">
	<PageHeader title="Hey, {displayName}" subtitle={data.todayLabel}>
		{#snippet avatar()}
			<UserAvatarMenu />
		{/snippet}
	</PageHeader>

	{#if isDisconnected}
		<section
			class="hero"
			data-hero-state={data.connection === 'reconnect' ? 'reconnect' : 'connect-required'}
		>
			<div class="hero-head">
				<span class="hero-eyebrow">{m.dashboard_eyebrow()}</span>
				<span class="hero-pill" data-tone={data.connection === 'reconnect' ? 'err' : 'accent'}>
					<span class="dot"></span>
					{data.connection === 'reconnect' ? m.devices_pill_reconnect() : m.devices_pill_setup()}
				</span>
			</div>
			<div class="orb-wrap" aria-hidden="true">
				<span class="orb">
					<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path
							d="M9.5 2h5v3l1.2 2.4A4 4 0 0 1 16 9.6V20a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9.6a4 4 0 0 1 .3-2.2L9.5 5V2Z"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linejoin="round"
						/>
						<path d="M9 12h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
					</svg>
				</span>
			</div>
			<div class="hero-body">
				<h1 class="hero-title">
					{data.connection === 'reconnect'
						? m.dashboard_reconnect_title()
						: m.dashboard_connect_required_title()}
				</h1>
				<p class="hero-sub">
					{data.connection === 'reconnect'
						? m.dashboard_reconnect_desc()
						: m.dashboard_connect_required_desc()}
				</p>
				<div class="hero-actions">
					<a class="btn primary" href="/settings?connect=1">
						<Plug size={14} strokeWidth={1.8} />
						{m.dashboard_connect_cta()}
					</a>
				</div>
			</div>
		</section>
	{:else}
		<a class="status-strip" href="/devices" data-tone={statusTone}>
			<span class="ss-eyebrow">{m.dashboard_eyebrow()}</span>
			<span class="ss-pill" data-tone={statusTone}>
				<span class="ss-dot"></span>
				{statusLabel}
			</span>
			<span class="ss-spacer"></span>
			{#if lastCheckedLabel}
				<span class="ss-meta">{m.dashboard_last_checked({ when: lastCheckedLabel })}</span>
			{/if}
			<ChevronRight size={14} strokeWidth={1.8} />
		</a>

		{#if showTaken && data.takenShift}
			<aside class="banner banner-warn">
				<div class="banner-ico"><XCircle size={16} strokeWidth={1.8} /></div>
				<div class="banner-body">
					<div class="banner-title">{m.dashboard_taken_title()}</div>
					<p class="banner-desc">
						{m.dashboard_taken_desc({
							warehouse: data.takenShift.offer.warehouse.name,
							date: fmtTakenDate(data.takenShift.offer.start)
						})}
					</p>
				</div>
				<button
					type="button"
					class="banner-x"
					onclick={() => (takenDismissed = true)}
					aria-label={m.dashboard_taken_dismiss()}
				>
					<XCircle size={14} strokeWidth={1.7} />
				</button>
			</aside>
		{/if}

		{#if data.warning === 'fetch_failed'}
			<aside class="banner banner-muted">
				<div class="banner-ico"><XCircle size={16} strokeWidth={1.8} /></div>
				<div class="banner-body">
					<p class="banner-desc">
						{m.dashboard_fetch_failed()}
						{#if data.correlationId}<span class="banner-cid" title="correlationId"
								>· {data.correlationId}</span
							>{/if}
					</p>
				</div>
			</aside>
		{/if}

		{#if data.plannedShifts.length > 0}
			<section class="dash-section">
				<div class="section-head">
					<span class="section-eyebrow">
						{m.dashboard_upcoming_title()}
						<span class="section-count"
							>· {m.dashboard_upcoming_count({ count: String(data.plannedShifts.length) })}</span
						>
					</span>
				</div>
				<div class="shift-list">
					{#each data.plannedShifts as shift (shift.shiftId)}
						<div class="shift-row" class:in-progress={shift.employeeStartedShift}>
							<div class="shift-date">
								<span class="dow">{dowLabel(shift.start)}</span>
								<span class="day">{dayMonth(shift.start)}</span>
							</div>
							<div class="shift-body">
								<div class="shift-title">
									{shift.warehouse.name} · {shift.workgroup.name}
									{#if shift.employeeStartedShift}
										<span class="badge ok">{m.dashboard_upcoming_in_progress()}</span>
									{/if}
								</div>
								<div class="shift-meta-row">
									<span class="time-range"
										>{fmtTimeRange(shift.start, shift.durationInMinutes)}</span
									>
									<span class="time-dur">{fmtDuration(shift.durationInMinutes)}</span>
									{#if shift.shiftType || shift.rewardScore > 0 || shift.isMarketplaceShift}
										<span class="chips-inline">
											{#if shift.shiftType}
												<span class="chip chip-type">{shift.shiftType}</span>
											{/if}
											{#if shift.rewardScore > 0}
												<span class="chip chip-bonus"
													>{m.dashboard_kronkorken({ n: String(shift.rewardScore) })}</span
												>
											{/if}
											{#if shift.isMarketplaceShift}
												<span class="chip chip-mp">📦</span>
											{/if}
										</span>
									{/if}
								</div>
							</div>
							<a
								class="cal-btn"
								href={calendarUrl(shift)}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={m.dashboard_add_to_calendar()}
								title={m.dashboard_add_to_calendar()}
							>
								<CalendarPlus size={14} strokeWidth={1.9} />
								<span class="cal-btn-label">{m.dashboard_add_to_calendar()}</span>
							</a>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		{#if data.matches.length > 0}
			<section class="dash-section">
				<div class="section-head">
					<span class="section-eyebrow">
						{m.dashboard_available_now()}
						<span class="section-count"
							>· {m.dashboard_available_count({ count: String(data.matches.length) })}</span
						>
					</span>
				</div>

				<div class="shift-list">
					{#each data.matches as offer (offer.dedupeKey)}
						{@const focused = highlightedRow === offer.dedupeKey}
						<div class="shift-row pickable" class:focused use:highlightFocus={offer.dedupeKey}>
							<div class="shift-date">
								<span class="dow">{dowLabel(offer.start)}</span>
								<span class="day">{dayMonth(offer.start)}</span>
							</div>
							<div class="shift-body">
								<div class="shift-title">{offer.warehouse.name} · {offer.workgroup.name}</div>
								<div class="shift-meta-row">
									<span class="time-range"
										>{fmtTimeRange(offer.start, offer.durationInMinutes)}</span
									>
									<span class="time-dur">{fmtDuration(offer.durationInMinutes)}</span>
									{#if offer.rewardScore > 0 || offer.isMarketplaceShift}
										<span class="chips-inline">
											{#if offer.rewardScore > 0}
												<span class="chip chip-bonus"
													>{m.dashboard_kronkorken({ n: String(offer.rewardScore) })}</span
												>
											{/if}
											{#if offer.isMarketplaceShift}
												<span class="chip chip-mp">📦</span>
											{/if}
										</span>
									{/if}
								</div>
							</div>
							<button
								type="button"
								class="take-btn"
								onclick={onTakeShift}
								title={m.dashboard_accept_soon_title()}
								aria-label={m.dashboard_take_shift()}
							>
								<Hand size={14} strokeWidth={1.9} />
								<span>{m.dashboard_take_shift()}</span>
							</button>
						</div>
					{/each}
				</div>
			</section>
		{:else}
			<div class="dev-empty">
				<div class="glyph">
					<svg
						viewBox="0 0 24 24"
						width="22"
						height="22"
						fill="none"
						stroke-width="1.6"
						aria-hidden="true"
					>
						<path
							d="M10 3h4v3l1.6 1.8c.6.7 1 1.6 1 2.5V19a2 2 0 0 1-2 2H9.4A2 2 0 0 1 7.4 19V10.3c0-.9.4-1.8 1-2.5L10 6V3Z"
							stroke="currentColor"
							stroke-linejoin="round"
						/>
						<path d="M9 14h6" stroke="currentColor" stroke-linecap="round" />
					</svg>
				</div>
				<h3>{m.dashboard_empty_title()}</h3>
				<p>{m.dashboard_empty_desc()}</p>
				<a class="btn primary" href="/filters">
					<Sliders size={14} strokeWidth={1.8} />
					{m.dashboard_adjust_filters()}
				</a>
			</div>
		{/if}

		{#if data.borderlines.length > 0}
			<details class="dash-section borderline-section">
				<summary>
					<span class="section-eyebrow">
						{m.dashboard_borderline()}
						<span class="section-count">· {data.borderlines.length}</span>
					</span>
					<span class="chev"><ChevronRight size={14} strokeWidth={1.8} /></span>
				</summary>
				<p class="section-desc">{m.dashboard_borderline_desc()}</p>
				<div class="shift-list">
					{#each data.borderlines as offer (offer.dedupeKey)}
						{@const focused = highlightedRow === offer.dedupeKey}
						<div
							class="shift-row pickable borderline"
							class:focused
							use:highlightFocus={offer.dedupeKey}
						>
							<div class="shift-date">
								<span class="dow">{dowLabel(offer.start)}</span>
								<span class="day">{dayMonth(offer.start)}</span>
							</div>
							<div class="shift-body">
								<div class="shift-title">{offer.warehouse.name} · {offer.workgroup.name}</div>
								<div class="shift-meta-row">
									<span class="time-range"
										>{fmtTimeRange(offer.start, offer.durationInMinutes)}</span
									>
									<span class="time-dur">{fmtDuration(offer.durationInMinutes)}</span>
									{#if offer.rewardScore > 0 || offer.isMarketplaceShift}
										<span class="chips-inline">
											{#if offer.rewardScore > 0}
												<span class="chip chip-bonus"
													>{m.dashboard_kronkorken({ n: String(offer.rewardScore) })}</span
												>
											{/if}
											{#if offer.isMarketplaceShift}
												<span class="chip chip-mp">📦</span>
											{/if}
										</span>
									{/if}
								</div>
							</div>
							<button
								type="button"
								class="take-btn ghost"
								onclick={onTakeShift}
								title={m.dashboard_accept_soon_title()}
								aria-label={m.dashboard_take_shift()}
							>
								<Hand size={14} strokeWidth={1.9} />
							</button>
						</div>
					{/each}
				</div>
			</details>
		{/if}

		{#if data.unmatched.length > 0}
			<details class="dash-section borderline-section unmatched-section">
				<summary>
					<span class="section-eyebrow">
						{m.dashboard_unmatched()}
						<span class="section-count">· {data.unmatched.length}</span>
					</span>
					<span class="chev"><ChevronRight size={14} strokeWidth={1.8} /></span>
				</summary>
				<p class="section-desc">{m.dashboard_unmatched_desc()}</p>
				<div class="shift-list">
					{#each data.unmatched as offer (offer.dedupeKey)}
						<div class="shift-row pickable unmatched">
							<div class="shift-date">
								<span class="dow">{dowLabel(offer.start)}</span>
								<span class="day">{dayMonth(offer.start)}</span>
							</div>
							<div class="shift-body">
								<div class="shift-title">{offer.warehouse.name} · {offer.workgroup.name}</div>
								<div class="shift-meta-row">
									<span class="time-range"
										>{fmtTimeRange(offer.start, offer.durationInMinutes)}</span
									>
									<span class="time-dur">{fmtDuration(offer.durationInMinutes)}</span>
									{#if offer.rewardScore > 0 || offer.isMarketplaceShift || offer.reason}
										<span class="chips-inline">
											{#if offer.rewardScore > 0}
												<span class="chip chip-bonus"
													>{m.dashboard_kronkorken({ n: String(offer.rewardScore) })}</span
												>
											{/if}
											{#if offer.isMarketplaceShift}
												<span class="chip chip-mp">📦</span>
											{/if}
											{#if offer.reason}
												<span class="chip chip-reason">{reasonLabel(offer.reason)}</span>
											{/if}
										</span>
									{/if}
								</div>
							</div>
							<button
								type="button"
								class="take-btn ghost"
								onclick={onTakeShift}
								title={m.dashboard_accept_soon_title()}
								aria-label={m.dashboard_take_shift()}
							>
								<Hand size={14} strokeWidth={1.9} />
							</button>
						</div>
					{/each}
				</div>
			</details>
		{/if}
	{/if}
</div>

{#if toastMessage}
	<div class="toast" role="status">
		<span class="toast-ico"><Info size={16} strokeWidth={1.8} /></span>
		<div class="toast-body">
			<div class="toast-title">{m.dashboard_accept_soon_title()}</div>
			<p class="toast-desc">{toastMessage}</p>
		</div>
		<button
			type="button"
			class="toast-x"
			onclick={() => {
				toastMessage = null;
				if (toastTimer) {
					clearTimeout(toastTimer);
					toastTimer = null;
				}
			}}
			aria-label={m.dashboard_taken_dismiss()}
		>
			<XCircle size={14} strokeWidth={1.7} />
		</button>
	</div>
{/if}

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.status-strip {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		text-decoration: none;
		color: inherit;
		background: var(--surface-1);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-lg);
	}
	.ss-eyebrow {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-subtle);
	}
	.ss-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 3px 10px;
		border-radius: 999px;
		font-family: var(--font-mono);
		font-size: 10.5px;
		letter-spacing: 0.06em;
		font-weight: 500;
		background: var(--bg-2);
		color: var(--text-muted);
		border: 1px solid var(--border-default);
	}
	.ss-pill[data-tone='ok'] {
		background: var(--ok-soft);
		color: var(--ok-ink);
		border-color: color-mix(in oklab, var(--ok) 30%, transparent);
	}
	.ss-pill[data-tone='warn'] {
		background: var(--warn-soft);
		color: var(--warn-ink);
		border-color: color-mix(in oklab, var(--warn) 30%, transparent);
	}
	.ss-pill[data-tone='err'] {
		background: var(--err-soft);
		color: var(--err-ink);
		border-color: color-mix(in oklab, var(--err) 30%, transparent);
	}
	.ss-pill[data-tone='accent'] {
		background: var(--accent-soft);
		color: var(--accent-ink);
		border-color: var(--accent-line);
	}
	.ss-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
	}
	.ss-spacer {
		flex: 1;
	}
	.ss-meta {
		font-family: var(--font-mono);
		font-size: 10.5px;
		color: var(--text-faint);
		letter-spacing: 0.04em;
	}

	.banner {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		padding: 12px 14px;
		border-radius: var(--radius-lg);
	}
	.banner-warn {
		background: var(--warn-soft);
		border: 1px solid color-mix(in oklab, var(--warn) 30%, transparent);
		color: var(--warn-ink);
	}
	.banner-muted {
		background: var(--bg-1);
		border: 1px dashed var(--border-strong);
		color: var(--text-muted);
	}
	.banner-ico {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		margin-top: 1px;
	}
	.banner-body {
		flex: 1;
		min-width: 0;
	}
	.banner-title {
		font-size: 13.5px;
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	.banner-desc {
		margin: 2px 0 0;
		font-size: 12.5px;
		line-height: 1.5;
	}
	.banner-cid {
		margin-left: 6px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-faint);
		letter-spacing: 0.04em;
	}
	.banner-x {
		appearance: none;
		border: 0;
		background: transparent;
		color: inherit;
		opacity: 0.7;
		cursor: pointer;
		flex-shrink: 0;
	}
	.banner-x:hover {
		opacity: 1;
	}

	.dash-section {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.section-eyebrow {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-primary);
		font-weight: 500;
	}
	.section-count {
		color: var(--text-subtle);
		font-weight: 400;
	}
	.section-desc {
		margin: -4px 4px 4px;
		font-size: 12px;
		color: var(--text-subtle);
		line-height: 1.45;
	}

	.shift-list {
		display: grid;
		gap: 8px;
	}
	.shift-row {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		background: var(--surface-1);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-lg);
		transition:
			border-color var(--dur-fast) var(--ease-out),
			outline-color var(--dur-base) var(--ease-out);
	}
	.shift-row.borderline {
		border-left: 3px solid color-mix(in oklab, var(--warn) 50%, transparent);
	}
	.shift-row.unmatched {
		border-left: 3px solid color-mix(in oklab, var(--text-faint) 60%, transparent);
		opacity: 0.92;
	}
	.shift-row.in-progress {
		border-color: color-mix(in oklab, var(--ok) 40%, var(--border-default));
	}
	.shift-row.focused {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.shift-date {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0 12px 0 0;
		min-width: 50px;
		border-right: 1px solid var(--border-default);
		margin-right: 2px;
	}
	.shift-date .dow {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.14em;
		color: var(--text-subtle);
		font-weight: 500;
		line-height: 1;
	}
	.shift-date .day {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.01em;
		line-height: 1.2;
		margin-top: 3px;
	}
	.shift-row.in-progress .shift-date .day {
		color: var(--ok-ink);
	}
	.shift-body {
		min-width: 0;
	}
	.shift-title {
		font-size: 13.5px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--text-primary);
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}
	.shift-meta-row {
		margin-top: 3px;
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		font-size: 11.5px;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}
	.time-range {
		font-weight: 500;
		color: var(--text-primary);
		letter-spacing: 0.01em;
	}
	.time-dur {
		color: var(--text-subtle);
		font-size: 10.5px;
		letter-spacing: 0.02em;
	}
	.chips-inline {
		display: inline-flex;
		gap: 5px;
		flex-wrap: wrap;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 2px 8px;
		border-radius: 999px;
		font-size: 10.5px;
		font-weight: 500;
		letter-spacing: 0.01em;
		line-height: 1.4;
		font-variant-numeric: tabular-nums;
		background: var(--bg-1);
		color: var(--text-muted);
		border: 1px solid var(--border-default);
	}
	.chip-bonus {
		background: color-mix(in oklab, var(--accent) 10%, var(--bg-1));
		color: var(--accent-ink);
		border-color: color-mix(in oklab, var(--accent) 25%, transparent);
	}
	.chip-mp {
		background: var(--bg-1);
	}
	.chip-type {
		text-transform: uppercase;
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.08em;
	}
	.chip-reason {
		background: color-mix(in oklab, var(--warn) 8%, var(--bg-1));
		color: var(--warn-ink);
		border-color: color-mix(in oklab, var(--warn) 25%, transparent);
	}
	.badge {
		display: inline-flex;
		align-items: center;
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 2px 7px;
		border-radius: 999px;
		font-weight: 500;
	}
	.badge.ok {
		background: var(--ok-soft);
		color: var(--ok-ink);
		border: 1px solid color-mix(in oklab, var(--ok) 30%, transparent);
	}

	.take-btn {
		appearance: none;
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 0 12px;
		height: 34px;
		border-radius: 999px;
		background: var(--accent);
		color: #fff;
		border: 0;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: -0.005em;
		cursor: pointer;
		transition: transform var(--dur-fast) var(--ease-out);
		font-family: var(--font-sans);
	}
	.take-btn:active {
		transform: scale(0.97);
	}
	.take-btn.ghost {
		background: transparent;
		color: var(--accent-ink);
		border: 1px solid var(--accent-line);
	}

	.cal-btn {
		appearance: none;
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 0 12px;
		height: 34px;
		border-radius: 999px;
		background: transparent;
		color: var(--accent-ink);
		border: 1px solid var(--accent-line);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: -0.005em;
		cursor: pointer;
		text-decoration: none;
		transition: transform var(--dur-fast) var(--ease-out);
		font-family: var(--font-sans);
	}
	.cal-btn:active {
		transform: scale(0.97);
	}
	@media (max-width: 420px) {
		.cal-btn-label,
		.take-btn span {
			display: none;
		}
		.cal-btn,
		.take-btn {
			padding: 0;
			width: 34px;
			justify-content: center;
		}
	}

	.borderline-section {
		background: var(--surface-1);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-lg);
		padding: 12px 14px;
		opacity: 0.9;
	}
	.borderline-section[open] {
		opacity: 1;
	}
	.unmatched-section {
		background: var(--bg-1);
		border: 1px dashed var(--border-default);
		opacity: 0.78;
	}
	.unmatched-section[open] {
		opacity: 1;
	}
	.borderline-section[open] {
		opacity: 1;
	}
	.borderline-section[open] summary .chev {
		transform: rotate(90deg);
	}
	.borderline-section summary {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		list-style: none;
		color: var(--text-primary);
	}
	.borderline-section summary::-webkit-details-marker {
		display: none;
	}
	.borderline-section .chev {
		margin-left: auto;
		color: var(--text-subtle);
		display: inline-grid;
		place-items: center;
		transition: transform var(--dur-fast) var(--ease-out);
	}

	.toast {
		position: fixed;
		left: 16px;
		right: 16px;
		bottom: calc(env(safe-area-inset-bottom, 0) + 80px);
		display: flex;
		gap: 12px;
		align-items: flex-start;
		max-width: 480px;
		margin: 0 auto;
		padding: 14px 16px;
		color: var(--text-primary);
		background: var(--surface-1);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-lg);
		box-shadow: 0 16px 40px -12px rgb(0 0 0 / 0.28);
		z-index: 50;
		animation: toast-in 220ms var(--ease-out);
	}
	.toast-ico {
		flex-shrink: 0;
		display: grid;
		place-items: center;
		margin-top: 1px;
		color: var(--accent);
	}
	.toast-body {
		flex: 1;
		min-width: 0;
	}
	.toast-title {
		font-size: 13.5px;
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	.toast-desc {
		margin: 3px 0 0;
		font-size: 12.5px;
		line-height: 1.5;
		color: var(--text-muted);
	}
	.toast-x {
		appearance: none;
		border: 0;
		background: transparent;
		color: var(--text-subtle);
		opacity: 0.7;
		cursor: pointer;
		flex-shrink: 0;
		padding: 0;
	}
	.toast-x:hover {
		opacity: 1;
	}
	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
