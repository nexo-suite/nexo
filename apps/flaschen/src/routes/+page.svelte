<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { onMount, untrack } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { applyAction, enhance } from '$app/forms';
	import { page } from '$app/state';
	import { BottomSheet, GreetingHeader, type SheetAction } from '@nexo/ui';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import MatchHotCard from '$lib/components/MatchHotCard.svelte';
	import { pushBridge } from '$lib/components/pushBridge.svelte.js';
	import { Plug, Sliders, ChevronRight, XCircle, Hand, Info, CalendarPlus } from '@lucide/svelte';
	import type { ActionData, PageData } from './$types';
	import type { PlannedShiftPayload } from '$lib/server/flaschenpost';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const displayName = $derived(data.profile?.displayName || data.user?.name || 'there');

	const statusTone = $derived.by<'ok' | 'warn' | 'err' | 'accent'>(() => {
		if (data.connection === 'reconnect') return 'err';
		if (data.connection === 'never') return 'accent';
		if (data.deviceCount === 0) return 'warn';
		if (!data.pollEnabled) return 'warn';
		if (inQuietHoursNow) return 'accent';
		return 'ok';
	});

	const statusLabel = $derived.by(() => {
		if (data.connection === 'never') return m.dashboard_status_setup();
		if (data.connection === 'reconnect') return m.dashboard_status_reconnect();
		if (data.deviceCount === 0) return m.dashboard_status_no_devices();
		if (!data.pollEnabled) return m.dashboard_status_paused();
		if (inQuietHoursNow) return m.dashboard_status_quiet();
		return m.dashboard_status_ok();
	});

	let nowMinute = $state(0);
	$effect(() => {
		const update = () => {
			const d = new Date();
			nowMinute = d.getHours() * 60 + d.getMinutes();
		};
		update();
		const id = setInterval(update, 60_000);
		return () => clearInterval(id);
	});

	const inQuietHoursNow = $derived.by(() => {
		if (!data.quietHours?.enabled) return false;
		const { startMinutes: start, endMinutes: end } = data.quietHours;
		return start === end ? false : start < end ? nowMinute >= start && nowMinute < end : nowMinute >= start || nowMinute < end;
	});

	let now = $state(Date.now());
	onMount(() => {
		pushBridge.install();
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

	const timeLabel = $derived(
		new Date(now).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })
	);

	// Greeting meta — terse, glanceable. Hardcoded English for now;
	// add i18n keys if/when the rest of the app gains plural-aware count messages.
	const greetDetails = $derived.by<string[]>(() => {
		const items: string[] = [timeLabel];
		const matchCount = data.matches.length;
		const borderlineCount = data.borderlines.length;
		if (matchCount > 0) items.push(matchCount === 1 ? '1 match' : `${matchCount} matches`);
		if (borderlineCount > 0)
			items.push(borderlineCount === 1 ? '1 borderline' : `${borderlineCount} borderlines`);
		if (items.length === 1) items.push(statusTone === 'ok' ? 'standby' : 'attention needed');
		return items;
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

	type TakeOffer = {
		warehouse: { name: string };
		workgroup: { name: string };
		start: string;
		durationInMinutes: number;
		rewardScore?: number;
		dedupeKey: string;
	};
	let takeOpen = $state(false);
	let takeSubmitting = $state(false);
	let pendingTake = $state<TakeOffer | null>(null);
	function onTakeShift(offer: TakeOffer) {
		pendingTake = offer;
		takeOpen = true;
	}

	const TAKE_FORM = 'take-shift-form';
	const takeActions = $derived<SheetAction[]>([
		{
			label: m.connect_cancel(),
			variant: 'secondary',
			onclick: () => {
				if (!takeSubmitting) takeOpen = false;
			}
		},
		{
			label: takeSubmitting ? m.dashboard_take_submitting() : m.dashboard_take_shift(),
			variant: 'primary',
			formId: TAKE_FORM
		}
	]);

	function takeErrorMessage(code: string): string {
		switch (code) {
			case 'OFFER_GONE':
				return m.dashboard_take_error_gone();
			case 'RECONNECT_REQUIRED':
				return m.dashboard_take_error_reconnect();
			case 'UPSTREAM_ERROR':
				return m.dashboard_take_error_upstream();
			default:
				return m.dashboard_take_error_unknown();
		}
	}

	$effect(() => {
		if (form?.takeSuccess) {
			flashToast(m.dashboard_take_success());
		} else if (form?.takeError) {
			flashToast(takeErrorMessage(String(form.takeError)));
		}
	});

	let takenDismissed = $state(false);
	const showTaken = $derived(!takenDismissed && data.takenShift !== null);

	let highlightedRow = $state<string | null>(null);
	function highlightFocus(node: HTMLElement, key: string) {
		if (data.focusKey && data.focusKey === key && !hotKey) {
			node.scrollIntoView({ block: 'center', behavior: 'smooth' });
			highlightedRow = key;
			setTimeout(() => {
				if (untrack(() => highlightedRow) === key) highlightedRow = null;
			}, 2200);
		}
	}

	// ── Hot card driver ─────────────────────────────────────────────
	// Two sources can light up the hot card:
	//   1. ?shift=<key>  → arrived via notification click
	//   2. live SW push  → app open when push fires
	// We track which dedupeKeys have been locally dismissed so a
	// "Skip for now" press hides the card without touching the DB.
	let dismissedKeys = $state<Set<string>>(new Set());
	let liveHot = $state<{ key: string; receivedAt: number } | null>(null);

	$effect(() => {
		const latest = pushBridge.latest;
		if (!latest) return;
		if (dismissedKeys.has(latest.dedupeKey)) return;
		liveHot = { key: latest.dedupeKey, receivedAt: latest.receivedAt };
		invalidateAll();
		pushBridge.clear();
	});

	const hotKey = $derived.by<string | null>(() => {
		if (liveHot && !dismissedKeys.has(liveHot.key)) return liveHot.key;
		if (data.focusKey && !dismissedKeys.has(data.focusKey)) return data.focusKey;
		return null;
	});

	const hotOffer = $derived.by(() => {
		if (!hotKey) return null;
		const found = data.matches.find((o) => o.dedupeKey === hotKey);
		if (found) return found;
		const borderlineHit = data.borderlines.find((o) => o.dedupeKey === hotKey);
		if (borderlineHit) return borderlineHit;
		return null;
	});

	const hotReceivedAt = $derived(liveHot?.key === hotKey ? liveHot.receivedAt : Date.now());

	function dismissHot(key: string) {
		const next = new Set(dismissedKeys);
		next.add(key);
		dismissedKeys = next;
		flashToast(m.dashboard_hot_skipped());
	}
	function takenHot(key: string) {
		const next = new Set(dismissedKeys);
		next.add(key);
		dismissedKeys = next;
	}

	// Strip the hot shift from the inline list while it lives in the hero slot —
	// we don't want it shown twice.
	const visibleMatches = $derived(
		hotKey ? data.matches.filter((o) => o.dedupeKey !== hotKey) : data.matches
	);
	const visibleBorderlines = $derived(
		hotKey ? data.borderlines.filter((o) => o.dedupeKey !== hotKey) : data.borderlines
	);

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
	<GreetingHeader name={displayName} eyebrow={data.todayLabel} details={greetDetails}>
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
	</GreetingHeader>

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
					<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
						<rect x="10.25" y="2.5" width="3.5" height="1.5" rx="0.3" />
						<path d="M10.5 4h3v4l2 2v9.5a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V10l2-2V4z" />
						<rect x="9" y="14" width="6" height="3" rx="0.4" fill="rgba(0, 0, 0, 0.22)" />
					</svg>
				</span>
			</div>
			<div class="hero-body">
				<h1 class="hero-title">
					{#if data.connection === 'reconnect'}
						<em>Reconnect</em> to keep watching.
					{:else}
						<em>Connect</em> Flaschenpost first.
					{/if}
				</h1>
				<p class="hero-sub">
					{data.connection === 'reconnect'
						? m.dashboard_reconnect_desc()
						: m.dashboard_connect_required_desc()}
				</p>
				<div class="hero-actions">
					<a class="btn primary" href="/settings?connect=1">
						<Plug size={16} strokeWidth={2} />
						{m.dashboard_connect_cta()}
					</a>
				</div>
			</div>
		</section>
	{:else}
		<a class="status-strip" href="/devices" data-tone={statusTone}>
			<span class="ss-orb"></span>
			<span class="ss-body">
				<span class="ss-eyebrow">{m.dashboard_eyebrow()}</span>
				<span class="ss-label">{statusLabel}</span>
			</span>
			{#if lastCheckedLabel}
				<span class="ss-meta">{m.dashboard_last_checked({ when: lastCheckedLabel })}</span>
			{/if}
			<ChevronRight size={16} strokeWidth={1.8} class="ss-chev" />
		</a>

		{#if hotOffer}
			<MatchHotCard
				offer={hotOffer}
				receivedAt={hotReceivedAt}
				onSkip={dismissHot}
				onTaken={takenHot}
			/>
		{/if}

		{#if showTaken && data.takenShift}
			<aside class="banner banner-warn">
				<div class="banner-ico"><XCircle size={18} strokeWidth={1.8} /></div>
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
					<div class="section-kicker">
						<span class="kicker-em">Roster</span>
						<span class="section-eyebrow">{m.dashboard_upcoming_title()}</span>
					</div>
					<span class="section-count"
						>{m.dashboard_upcoming_count({ count: String(data.plannedShifts.length) })}</span
					>
				</div>
				<div class="shift-list stagger">
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

		{#if visibleMatches.length > 0}
			<section class="dash-section dash-section--ontap">
				<div class="section-head">
					<div class="section-kicker">
						<span class="kicker-em">On tap</span>
						<span class="section-eyebrow">{m.dashboard_available_now()}</span>
					</div>
					<span class="section-count"
						>{m.dashboard_available_count({ count: String(visibleMatches.length) })}</span
					>
				</div>

				<div class="shift-list stagger">
					{#each visibleMatches as offer (offer.dedupeKey)}
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
								onclick={() => onTakeShift(offer)}
								title={m.dashboard_take_shift()}
								aria-label={m.dashboard_take_shift()}
							>
								<Hand size={14} strokeWidth={1.9} />
								<span>{m.dashboard_take_shift()}</span>
							</button>
						</div>
					{/each}
				</div>
			</section>
		{:else if !hotOffer}
			<div class="dev-empty">
				<div class="glyph">
					<svg
						viewBox="0 0 24 24"
						width="30"
						height="30"
						fill="currentColor"
						aria-hidden="true"
					>
						<rect x="10.25" y="2.5" width="3.5" height="1.5" rx="0.3" />
						<path d="M10.5 4h3v4l2 2v9.5a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V10l2-2V4z" />
						<rect x="9" y="14" width="6" height="3" rx="0.4" fill="rgba(0, 0, 0, 0.22)" />
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

		{#if visibleBorderlines.length > 0}
			<details class="dash-section borderline-section">
				<summary>
					<span class="section-eyebrow">
						{m.dashboard_borderline()}
						<span class="section-count">· {visibleBorderlines.length}</span>
					</span>
					<span class="chev"><ChevronRight size={14} strokeWidth={1.8} /></span>
				</summary>
				<p class="section-desc">{m.dashboard_borderline_desc()}</p>
				<div class="shift-list">
					{#each visibleBorderlines as offer (offer.dedupeKey)}
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
								onclick={() => onTakeShift(offer)}
								title={m.dashboard_take_shift()}
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
								onclick={() => onTakeShift(offer)}
								title={m.dashboard_take_shift()}
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

<!-- ─── Take-shift confirm sheet (used by inline list buttons) ─── -->
<BottomSheet
	bind:open={takeOpen}
	title={m.dashboard_take_shift()}
	subtitle={m.dashboard_take_confirm_subtitle()}
	actions={takeActions}
>
	{#if pendingTake}
		<form
			id={TAKE_FORM}
			method="POST"
			action="?/takeShift"
			onsubmit={(e) => {
				if (takeSubmitting) e.preventDefault();
			}}
			use:enhance={() => {
				takeSubmitting = true;
				return async ({ result }) => {
					takeSubmitting = false;
					await applyAction(result);
					if (result.type === 'success') {
						takeOpen = false;
						pendingTake = null;
						await invalidateAll();
					} else if (result.type === 'failure' && result.data?.takeError === 'OFFER_GONE') {
						takeOpen = false;
						pendingTake = null;
						await invalidateAll();
					}
				};
			}}
		>
			<input type="hidden" name="dedupeKey" value={pendingTake.dedupeKey} />
			<div class="confirm-shift">
				<div class="confirm-row">
					<span class="confirm-label">Warehouse</span>
					<span class="confirm-value"
						>{pendingTake.warehouse.name} · {pendingTake.workgroup.name}</span
					>
				</div>
				<div class="confirm-row">
					<span class="confirm-label">When</span>
					<span class="confirm-value"
						>{dowLabel(pendingTake.start)}
						{dayMonth(pendingTake.start)} ·
						{fmtTimeRange(pendingTake.start, pendingTake.durationInMinutes)}</span
					>
				</div>
				<div class="confirm-row">
					<span class="confirm-label">Duration</span>
					<span class="confirm-value">{fmtDuration(pendingTake.durationInMinutes)}</span>
				</div>
			</div>
		</form>
	{/if}
</BottomSheet>

{#if toastMessage}
	<div class="toast" role="status">
		<span class="toast-ico"><Info size={18} strokeWidth={1.8} /></span>
		<div class="toast-body">
			<div class="toast-title">{m.dashboard_take_toast_title()}</div>
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
