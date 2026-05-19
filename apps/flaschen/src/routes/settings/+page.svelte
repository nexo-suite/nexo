<script lang="ts">
	import { untrack } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { enhance } from '$app/forms';
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { BottomSheet, ProfileHubCard, SaveBar, Toggle } from '@nexo/ui';
	import {
		AlertTriangle,
		CheckCircle2,
		ChevronDown,
		ChevronRight,
		Plus,
		Trash2,
		X
	} from '@lucide/svelte';
	import type { WeeklySlot, WeeklyWindows } from '@nexo/db';

	let { data, form } = $props();

	const SHIFT_OPEN_MIN = 420; // 07:00
	const SHIFT_CLOSE_MIN = 1380; // 23:00
	const DEFAULT_SLOT: WeeklySlot = { start: 1020, end: 1320 }; // 17:00–22:00

	let enabled = $state(untrack(() => data.prefs.enabled));
	let weeklyWindows = $state<WeeklyWindows>(untrack(() => cloneWindows(data.prefs.weeklyWindows)));
	let warehouseIds = $state<number[]>(untrack(() => [...data.prefs.warehouseIds]));
	let workgroupIds = $state<number[]>(untrack(() => [...data.prefs.workgroupIds]));
	let shiftMaxMinutes = $state(untrack(() => data.prefs.shiftMaxMinutes));
	let includeMarketplace = $state(untrack(() => data.prefs.includeMarketplace));

	let connectOpen = $state(false);
	let connecting = $state(false);
	let scheduleSheetOpen = $state(false);
	let lengthSheetOpen = $state(false);
	let warehousesSheetOpen = $state(false);
	let workgroupsSheetOpen = $state(false);
	let unsavedSheetOpen = $state(false);
	let pendingNavUrl = $state<string | null>(null);
	let expandedDay = $state<number | null>(null);

	// Open the connect sheet automatically when arriving from the home CTA
	// (`/settings?connect=1`). Strip the query so reloads don't re-open it.
	$effect(() => {
		if (page.url.searchParams.get('connect') === '1') {
			connectOpen = true;
			const url = new URL(page.url);
			url.searchParams.delete('connect');
			void goto(url.pathname + url.search, { replaceState: true, noScroll: true });
		}
	});

	type OverrideDraft = {
		id: string | null;
		date: string;
		kind: 'available' | 'unavailable';
		slots: WeeklySlot[];
		note: string;
	};
	let overrideSheetOpen = $state(false);
	let overrideDraft = $state<OverrideDraft | null>(null);
	let overrideSubmitting = $state(false);

	const hubUrl = env.PUBLIC_LANDING_URL
		? `${env.PUBLIC_LANDING_URL}/apps`
		: 'https://krieger2501.de/apps';

	const languageLabels: Record<string, string> = {
		auto: 'Auto',
		en: 'English',
		de: 'Deutsch',
		tr: 'Türkçe'
	};
	const themeLabels: Record<string, string> = {
		system: 'System',
		light: 'Light',
		dark: 'Dark'
	};
	const weekStartLabels: Record<string, string> = {
		monday: 'Monday',
		sunday: 'Sunday',
		saturday: 'Saturday'
	};

	const dayLabels = $derived([
		{ value: 1, short: m.days_mon(), long: m.days_mon() },
		{ value: 2, short: m.days_tue(), long: m.days_tue() },
		{ value: 3, short: m.days_wed(), long: m.days_wed() },
		{ value: 4, short: m.days_thu(), long: m.days_thu() },
		{ value: 5, short: m.days_fri(), long: m.days_fri() },
		{ value: 6, short: m.days_sat(), long: m.days_sat() },
		{ value: 7, short: m.days_sun(), long: m.days_sun() }
	]);

	const knownWarehouses = $derived(
		dedupeBy(
			[
				{ warehouseId: 3, name: 'Mannheim' },
				...data.knownLocations.map((l) => ({
					warehouseId: l.warehouseId,
					name: l.warehouseName
				}))
			],
			(w) => w.warehouseId
		)
	);

	const knownWorkgroups = $derived(
		dedupeBy(
			[
				{ workgroupId: 1, name: 'Auslieferung' },
				...data.knownLocations.map((l) => ({
					workgroupId: l.workgroupId,
					name: l.workgroupName
				}))
			],
			(w) => w.workgroupId
		)
	);

	const dirty = $derived.by(() => {
		const cur = JSON.stringify({
			enabled,
			weeklyWindows: normalizeWindows(weeklyWindows),
			warehouseIds: [...warehouseIds].sort((a, b) => a - b),
			workgroupIds: [...workgroupIds].sort((a, b) => a - b),
			shiftMaxMinutes,
			includeMarketplace
		});
		const init = JSON.stringify({
			enabled: data.prefs.enabled,
			weeklyWindows: normalizeWindows(data.prefs.weeklyWindows),
			warehouseIds: [...data.prefs.warehouseIds].sort((a, b) => a - b),
			workgroupIds: [...data.prefs.workgroupIds].sort((a, b) => a - b),
			shiftMaxMinutes: data.prefs.shiftMaxMinutes,
			includeMarketplace: data.prefs.includeMarketplace
		});
		return cur !== init;
	});

	const scheduleHasError = $derived(
		([1, 2, 3, 4, 5, 6, 7] as const).some((d) =>
			dayHasError(weeklyWindows[String(d) as keyof WeeklyWindows])
		)
	);

	const accountStatus = $derived.by(() => {
		if (!data.account) return 'never' as const;
		if (data.account.needsReconnect) return 'reconnect' as const;
		return 'connected' as const;
	});

	const lastRefreshed = $derived(formatRelative(data.account?.lastLoginAt ?? null));

	const scheduleSummary = $derived.by(() => {
		const activeDays = ([1, 2, 3, 4, 5, 6, 7] as const).filter(
			(d) => weeklyWindows[String(d) as keyof WeeklyWindows].length > 0
		);
		if (activeDays.length === 0) return m.settings_schedule_summary_off();
		const first = weeklyWindows[String(activeDays[0]) as keyof WeeklyWindows];
		const sameShape = activeDays.every(
			(d) =>
				JSON.stringify(weeklyWindows[String(d) as keyof WeeklyWindows]) === JSON.stringify(first)
		);
		if (sameShape && first.length === 1) {
			return `${activeDays.length}d · ${minutesToHHMM(first[0].start)}–${minutesToHHMM(first[0].end)}`;
		}
		return `${activeDays.length}d · ${m.settings_schedule_summary_varies()}`;
	});

	const lengthSummary = $derived(formatShiftLength(shiftMaxMinutes));

	const warehousesSummary = $derived(
		warehouseIds.length === 0
			? 'None'
			: warehouseIds
					.map((id) => knownWarehouses.find((w) => w.warehouseId === id)?.name)
					.filter(Boolean)
					.join(', ')
	);

	const workgroupsSummary = $derived(
		workgroupIds.length === 0
			? 'None'
			: workgroupIds
					.map((id) => knownWorkgroups.find((w) => w.workgroupId === id)?.name)
					.filter(Boolean)
					.join(', ')
	);

	const overrideSlotsValid = $derived.by(() => {
		if (!overrideDraft) return true;
		if (overrideDraft.kind !== 'available') return true;
		if (overrideDraft.slots.length === 0) return false;
		return !dayHasError(overrideDraft.slots);
	});

	const today = $derived(berlinTodayISO());

	function cloneWindows(w: WeeklyWindows): WeeklyWindows {
		return {
			'1': w['1'].map((s) => ({ ...s })),
			'2': w['2'].map((s) => ({ ...s })),
			'3': w['3'].map((s) => ({ ...s })),
			'4': w['4'].map((s) => ({ ...s })),
			'5': w['5'].map((s) => ({ ...s })),
			'6': w['6'].map((s) => ({ ...s })),
			'7': w['7'].map((s) => ({ ...s }))
		};
	}

	function normalizeWindows(w: WeeklyWindows): WeeklyWindows {
		const sortSlots = (s: WeeklySlot[]) =>
			[...s].sort((a, b) => a.start - b.start).map((x) => ({ start: x.start, end: x.end }));
		return {
			'1': sortSlots(w['1']),
			'2': sortSlots(w['2']),
			'3': sortSlots(w['3']),
			'4': sortSlots(w['4']),
			'5': sortSlots(w['5']),
			'6': sortSlots(w['6']),
			'7': sortSlots(w['7'])
		};
	}

	function minutesToHHMM(mins: number): string {
		const h = Math.floor(mins / 60);
		const m2 = mins % 60;
		return `${String(h).padStart(2, '0')}:${String(m2).padStart(2, '0')}`;
	}
	function hhmmToMinutes(s: string): number {
		const m2 = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
		if (!m2) return 0;
		return Number(m2[1]) * 60 + Number(m2[2]);
	}
	function clampMinutes(mins: number): number {
		return Math.max(SHIFT_OPEN_MIN, Math.min(SHIFT_CLOSE_MIN, mins));
	}

	function dedupeBy<T>(arr: T[], key: (x: T) => number | string): T[] {
		const seen: Record<string, true> = {};
		const out: T[] = [];
		for (const x of arr) {
			const k = String(key(x));
			if (seen[k]) continue;
			seen[k] = true;
			out.push(x);
		}
		return out;
	}
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

	function formatShiftLength(mins: number): string {
		const h = Math.floor(mins / 60);
		const m2 = mins % 60;
		if (m2 === 0) return `${h}h`;
		return `${h}:${String(m2).padStart(2, '0')}h`;
	}

	function berlinTodayISO(): string {
		return new Date(new Date().toLocaleString('en-CA', { timeZone: 'Europe/Berlin' }).split(',')[0])
			.toISOString()
			.slice(0, 10);
	}

	function formatOverrideDate(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});
	}

	function dayHasError(slots: WeeklySlot[]): boolean {
		for (const s of slots) {
			if (s.end <= s.start) return true;
			if (s.start < SHIFT_OPEN_MIN || s.end > SHIFT_CLOSE_MIN) return true;
		}
		const sorted = [...slots].sort((a, b) => a.start - b.start);
		for (let i = 1; i < sorted.length; i++) {
			if (sorted[i].start < sorted[i - 1].end) return true;
		}
		return false;
	}

	function daySummary(day: number): string {
		const slots = weeklyWindows[String(day) as keyof WeeklyWindows];
		if (slots.length === 0) return day === 7 ? m.settings_day_closed() : m.settings_day_off();
		return slots.map((s) => `${minutesToHHMM(s.start)}–${minutesToHHMM(s.end)}`).join(', ');
	}

	function toggleDayExpand(day: number) {
		if (day === 7) return;
		expandedDay = expandedDay === day ? null : day;
	}

	function addSlot(day: number) {
		const key = String(day) as keyof WeeklyWindows;
		const cur = weeklyWindows[key];
		// Find a slot that doesn't overlap with existing ones, falling back to default.
		let candidate = { ...DEFAULT_SLOT };
		const sorted = [...cur].sort((a, b) => a.start - b.start);
		const last = sorted[sorted.length - 1];
		if (last && last.end < SHIFT_CLOSE_MIN) {
			const start = clampMinutes(last.end);
			const end = clampMinutes(start + 180);
			if (end > start) candidate = { start, end };
		}
		weeklyWindows = { ...weeklyWindows, [key]: [...cur, candidate] };
	}

	function removeSlot(day: number, idx: number) {
		const key = String(day) as keyof WeeklyWindows;
		const next = weeklyWindows[key].filter((_, i) => i !== idx);
		weeklyWindows = { ...weeklyWindows, [key]: next };
	}

	function updateSlot(day: number, idx: number, field: 'start' | 'end', value: string) {
		const key = String(day) as keyof WeeklyWindows;
		const mins = clampMinutes(hhmmToMinutes(value));
		const next = weeklyWindows[key].map((s, i) => (i === idx ? { ...s, [field]: mins } : s));
		weeklyWindows = { ...weeklyWindows, [key]: next };
	}

	function toggleWarehouse(id: number) {
		warehouseIds = warehouseIds.includes(id)
			? warehouseIds.filter((x) => x !== id)
			: [...warehouseIds, id];
	}
	function toggleWorkgroup(id: number) {
		workgroupIds = workgroupIds.includes(id)
			? workgroupIds.filter((x) => x !== id)
			: [...workgroupIds, id];
	}

	function openNewOverride() {
		overrideDraft = {
			id: null,
			date: today,
			kind: 'available',
			slots: [{ ...DEFAULT_SLOT }],
			note: ''
		};
		overrideSheetOpen = true;
	}

	function openEditOverride(o: (typeof data.dateOverrides)[number]) {
		overrideDraft = {
			id: o.id,
			date: o.date,
			kind: o.kind,
			slots:
				o.kind === 'available' && o.slots.length > 0
					? o.slots.map((s) => ({ ...s }))
					: [{ ...DEFAULT_SLOT }],
			note: o.note ?? ''
		};
		overrideSheetOpen = true;
	}

	function addOverrideSlot() {
		if (!overrideDraft) return;
		const sorted = [...overrideDraft.slots].sort((a, b) => a.start - b.start);
		const last = sorted[sorted.length - 1];
		let candidate = { ...DEFAULT_SLOT };
		if (last && last.end < SHIFT_CLOSE_MIN) {
			const start = clampMinutes(last.end);
			const end = clampMinutes(start + 180);
			if (end > start) candidate = { start, end };
		}
		overrideDraft = { ...overrideDraft, slots: [...overrideDraft.slots, candidate] };
	}

	function removeOverrideSlot(idx: number) {
		if (!overrideDraft) return;
		overrideDraft = {
			...overrideDraft,
			slots: overrideDraft.slots.filter((_, i) => i !== idx)
		};
	}

	function updateOverrideSlot(idx: number, field: 'start' | 'end', value: string) {
		if (!overrideDraft) return;
		const mins = clampMinutes(hhmmToMinutes(value));
		overrideDraft = {
			...overrideDraft,
			slots: overrideDraft.slots.map((s, i) => (i === idx ? { ...s, [field]: mins } : s))
		};
	}

	beforeNavigate(({ cancel, to, type }) => {
		if (type === 'form') return;
		if (dirty && !unsavedSheetOpen) {
			cancel();
			pendingNavUrl = to?.url.pathname ?? null;
			unsavedSheetOpen = true;
		}
	});

	function discardAndGo() {
		enabled = data.prefs.enabled;
		weeklyWindows = cloneWindows(data.prefs.weeklyWindows);
		warehouseIds = [...data.prefs.warehouseIds];
		workgroupIds = [...data.prefs.workgroupIds];
		shiftMaxMinutes = data.prefs.shiftMaxMinutes;
		includeMarketplace = data.prefs.includeMarketplace;
		unsavedSheetOpen = false;
		if (pendingNavUrl) goto(pendingNavUrl);
	}
</script>

<div class="page" class:has-save-bar={dirty && !scheduleHasError}>
	<header class="header">
		<h1 class="title">{m.nav_settings()}</h1>
		<p class="subtitle">Tune what counts as a match. We notify only on strict matches.</p>
	</header>

	{#if accountStatus === 'reconnect'}
		<div class="banner banner-err">
			<AlertTriangle size={18} strokeWidth={1.8} />
			<span>{m.settings_needs_reconnect()}</span>
			<button type="button" onclick={() => (connectOpen = true)}>{m.settings_reconnect()}</button>
		</div>
	{/if}

	{#if form?.success}
		<div class="banner banner-ok">
			<CheckCircle2 size={18} strokeWidth={1.8} />
			<span>{m.saved()}</span>
		</div>
	{/if}

	<form
		id="prefs-form"
		method="POST"
		action="?/savePrefs"
		use:enhance={() =>
			({ update }) =>
				update({ reset: false })}
	>
		<input type="hidden" name="weeklyWindows" value={JSON.stringify(weeklyWindows)} />
		<input type="hidden" name="warehouseIds" value={warehouseIds.join(',')} />
		<input type="hidden" name="workgroupIds" value={workgroupIds.join(',')} />
		<input type="hidden" name="shiftMaxMinutes" value={shiftMaxMinutes} />
		{#if enabled}<input type="hidden" name="enabled" value="on" />{/if}
		{#if includeMarketplace}<input type="hidden" name="includeMarketplace" value="on" />{/if}

		<ProfileHubCard
			name={data.profile.name}
			email={data.profile.email}
			{hubUrl}
			displayName={data.profile.displayName}
			language={languageLabels[data.profile.language] ?? data.profile.language}
			weekStarts={weekStartLabels[data.profile.weekStartDay] ?? 'Monday'}
			theme={themeLabels[data.profile.theme] ?? data.profile.theme}
		/>

		<!-- ─── Watching ─── -->
		<div class="section-label">
			<span class="sl-title"><b>Watching</b> · master switch</span>
		</div>
		<div class="set-card">
			<div class="set-row" style="cursor: default">
				<div class="sr-icon">{enabled ? '◉' : '◯'}</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_polling_enabled()}</div>
					<div class="sr-desc">{m.settings_polling_hint()}</div>
				</div>
				<div class="sr-toggle">
					<Toggle bind:checked={enabled} ariaLabel="Enable polling" />
				</div>
			</div>
		</div>

		<!-- ─── When ─── -->
		<div class="section-label">
			<span class="sl-title"><b>{m.settings_when()}</b></span>
		</div>
		<div class="set-card">
			<button type="button" class="set-row" onclick={() => (scheduleSheetOpen = true)}>
				<div class="sr-icon">📆</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_schedule()}</div>
					<div class="sr-desc">{m.settings_schedule_hint()}</div>
				</div>
				<div class="sr-value">{scheduleSummary}</div>
				<span class="sr-chev"><ChevronRight size={16} strokeWidth={1.8} /></span>
			</button>

			<button type="button" class="set-row" onclick={() => (lengthSheetOpen = true)}>
				<div class="sr-icon">⏱</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_max_length()}</div>
					<div class="sr-desc">Longer shifts go to "borderline" on the home page.</div>
				</div>
				<div class="sr-value">≤ {lengthSummary}</div>
				<span class="sr-chev"><ChevronRight size={16} strokeWidth={1.8} /></span>
			</button>

			<div class="row-divider">
				<span class="row-divider-label">{m.settings_special_days()}</span>
			</div>

			{#each data.dateOverrides as o (o.id)}
				<button type="button" class="set-row" onclick={() => openEditOverride(o)}>
					<div
						class="sr-icon"
						class:sr-icon-ok={o.kind === 'available'}
						class:sr-icon-err={o.kind === 'unavailable'}
					>
						{o.kind === 'available' ? '✓' : '✕'}
					</div>
					<div class="sr-text">
						<div class="sr-label">{formatOverrideDate(o.date)}</div>
						<div class="sr-desc sr-desc-trim">
							{#if o.kind === 'available'}
								{o.slots.map((s) => `${minutesToHHMM(s.start)}–${minutesToHHMM(s.end)}`).join(', ')}
							{:else}
								{m.override_kind_unavailable()}
							{/if}
							{#if o.note}· {o.note}{/if}
						</div>
					</div>
					<span class="sr-chev"><ChevronRight size={16} strokeWidth={1.8} /></span>
				</button>
			{/each}

			<button type="button" class="set-row add-row" onclick={openNewOverride}>
				<div class="sr-icon sr-icon-accent"><Plus size={14} strokeWidth={2} /></div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_special_add()}</div>
					<div class="sr-desc">{m.settings_special_days_hint()}</div>
				</div>
				<span class="sr-chev"><ChevronRight size={16} strokeWidth={1.8} /></span>
			</button>
		</div>

		<!-- ─── Where ─── -->
		<div class="section-label">
			<span class="sl-title"><b>{m.settings_where()}</b> · location & job</span>
		</div>
		<div class="set-card">
			<button type="button" class="set-row" onclick={() => (warehousesSheetOpen = true)}>
				<div class="sr-icon">📍</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_warehouses()}</div>
					<div class="sr-desc">{warehouseIds.length} selected</div>
				</div>
				<div class="sr-value sr-value-trim">{warehousesSummary}</div>
				<span class="sr-chev"><ChevronRight size={16} strokeWidth={1.8} /></span>
			</button>

			<button type="button" class="set-row" onclick={() => (workgroupsSheetOpen = true)}>
				<div class="sr-icon">👤</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_workgroups()}</div>
					<div class="sr-desc">{workgroupIds.length} selected</div>
				</div>
				<div class="sr-value sr-value-trim">{workgroupsSummary}</div>
				<span class="sr-chev"><ChevronRight size={16} strokeWidth={1.8} /></span>
			</button>
		</div>

		<!-- ─── Other ─── -->
		<div class="section-label">
			<span class="sl-title"><b>{m.settings_other()}</b></span>
		</div>
		<div class="set-card">
			<div class="set-row" style="cursor: default">
				<div class="sr-icon">★</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_include_marketplace()}</div>
					<div class="sr-desc">Marketplace shifts swap between employees.</div>
				</div>
				<div class="sr-toggle">
					<Toggle bind:checked={includeMarketplace} ariaLabel="Include marketplace shifts" />
				</div>
			</div>
		</div>
	</form>

	<!-- ─── Account ─── -->
	<div class="section-label">
		<span class="sl-title"><b>{m.settings_account()}</b> · Flaschenpost link</span>
		{#if accountStatus === 'connected'}
			<span class="sl-right">connected</span>
		{:else if accountStatus === 'reconnect'}
			<span class="sl-right sl-right-err">expired</span>
		{:else}
			<span class="sl-right">not linked</span>
		{/if}
	</div>
	<div class="set-card">
		{#if accountStatus === 'never'}
			<button type="button" class="set-row" onclick={() => (connectOpen = true)}>
				<div class="sr-icon sr-icon-accent">→</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_connect()}</div>
					<div class="sr-desc">We'll keep an encrypted refresh token, never your password.</div>
				</div>
				<span class="sr-chev"><ChevronRight size={16} strokeWidth={1.8} /></span>
			</button>
		{:else}
			<div class="set-row" style="cursor: default">
				<div
					class="sr-icon"
					class:sr-icon-ok={accountStatus === 'connected'}
					class:sr-icon-err={accountStatus === 'reconnect'}
				>
					{accountStatus === 'connected' ? '✓' : '!'}
				</div>
				<div class="sr-text">
					<div class="sr-label">
						{accountStatus === 'reconnect' ? m.settings_needs_reconnect() : m.settings_connected()}
					</div>
					<div class="sr-desc">
						{m.settings_employee_id()}: {data.account?.employeeId}{#if lastRefreshed}
							· {m.settings_last_refreshed()}: {lastRefreshed}{/if}
					</div>
				</div>
			</div>
			{#if accountStatus === 'reconnect'}
				<button type="button" class="set-row" onclick={() => (connectOpen = true)}>
					<div class="sr-icon sr-icon-accent">↻</div>
					<div class="sr-text">
						<div class="sr-label">{m.settings_reconnect()}</div>
					</div>
					<span class="sr-chev"><ChevronRight size={16} strokeWidth={1.8} /></span>
				</button>
			{/if}
			<form method="POST" action="?/disconnect" use:enhance class="disconnect-form">
				<button type="submit" class="set-row danger-row">
					<div class="sr-icon sr-icon-danger">⎋</div>
					<div class="sr-text">
						<div class="sr-label">{m.settings_disconnect()}</div>
						<div class="sr-desc">Revokes our refresh token and stops watching.</div>
					</div>
					<span class="sr-chev"><ChevronRight size={16} strokeWidth={1.8} /></span>
				</button>
			</form>
		{/if}
	</div>
</div>

<!-- ─── Sticky save bar ─── -->
<SaveBar
	visible={dirty && !scheduleHasError}
	hint={m.save_changes()}
	label={m.save_changes()}
	formId="prefs-form"
/>

<!-- ─── Schedule sheet (inline accordion) ─── -->
<BottomSheet
	bind:open={scheduleSheetOpen}
	title={m.settings_schedule()}
	subtitle={m.settings_schedule_hint()}
>
	<div class="schedule-list">
		{#each dayLabels as d (d.value)}
			{@const sunday = d.value === 7}
			{@const slots = weeklyWindows[String(d.value) as keyof WeeklyWindows]}
			{@const expanded = expandedDay === d.value}
			{@const errored = dayHasError(slots)}
			<div class="day-block" class:expanded class:sunday>
				<button
					type="button"
					class="day-header"
					disabled={sunday}
					onclick={() => toggleDayExpand(d.value)}
				>
					<span class="day-name">{d.long}</span>
					<span class="day-summary" class:err={errored}>{daySummary(d.value)}</span>
					{#if !sunday}
						<span class="day-chev" class:open={expanded}>
							<ChevronDown size={16} strokeWidth={1.8} />
						</span>
					{/if}
				</button>
				{#if expanded && !sunday}
					<div class="day-slots">
						{#each slots as slot, i (i)}
							<div class="slot-row">
								<input
									type="time"
									min="07:00"
									max="23:00"
									step="900"
									value={minutesToHHMM(slot.start)}
									onchange={(e) =>
										updateSlot(d.value, i, 'start', (e.currentTarget as HTMLInputElement).value)}
								/>
								<span class="slot-sep">–</span>
								<input
									type="time"
									min="07:00"
									max="23:00"
									step="900"
									value={minutesToHHMM(slot.end)}
									onchange={(e) =>
										updateSlot(d.value, i, 'end', (e.currentTarget as HTMLInputElement).value)}
								/>
								<button
									type="button"
									class="slot-remove"
									aria-label={m.settings_remove_slot()}
									onclick={() => removeSlot(d.value, i)}
								>
									<X size={16} strokeWidth={1.8} />
								</button>
							</div>
						{/each}
						{#if errored}
							<div class="sheet-error">
								{slots.some((s) => s.end <= s.start)
									? m.settings_slot_invalid()
									: m.settings_slot_overlap()}
							</div>
						{/if}
						<button type="button" class="slot-add" onclick={() => addSlot(d.value)}>
							<Plus size={14} strokeWidth={2} />
							{m.settings_add_slot()}
						</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>
	<div class="sheet-actions">
		<button
			type="button"
			class="sheet-done"
			onclick={() => (scheduleSheetOpen = false)}
			disabled={scheduleHasError}>Done</button
		>
	</div>
</BottomSheet>

<!-- ─── Length sheet ─── -->
<BottomSheet
	bind:open={lengthSheetOpen}
	title={m.settings_max_length()}
	subtitle={m.settings_max_length_hint()}
>
	<div class="length-display">
		<span class="length-display-val">{lengthSummary}</span>
		<span class="length-display-cap">max shift</span>
	</div>
	<input
		type="range"
		min="60"
		max="600"
		step="30"
		bind:value={shiftMaxMinutes}
		class="length-slider"
	/>
	<div class="length-axis" aria-hidden="true">
		<span>1h</span><span>3h</span><span>5h</span><span>7h</span><span>10h</span>
	</div>
	<div class="sheet-actions">
		<button type="button" class="sheet-done" onclick={() => (lengthSheetOpen = false)}>Done</button>
	</div>
</BottomSheet>

<!-- ─── Warehouses sheet ─── -->
<BottomSheet
	bind:open={warehousesSheetOpen}
	title={m.settings_warehouses()}
	subtitle="More appear here as the worker discovers them."
>
	<div class="sheet-picker">
		{#each knownWarehouses as w (w.warehouseId)}
			{@const active = warehouseIds.includes(w.warehouseId)}
			<button
				type="button"
				class="sheet-opt"
				class:active
				onclick={() => toggleWarehouse(w.warehouseId)}
			>
				<span class="sheet-opt-icon">📍</span>
				<span class="sheet-opt-text">
					<span class="sheet-opt-name">{w.name}</span>
					<span class="sheet-opt-desc">#{w.warehouseId}</span>
				</span>
				<span class="sheet-check" class:on={active}>{active ? '✓' : ''}</span>
			</button>
		{/each}
	</div>
	<div class="sheet-actions">
		<button type="button" class="sheet-done" onclick={() => (warehousesSheetOpen = false)}
			>Done</button
		>
	</div>
</BottomSheet>

<!-- ─── Workgroups sheet ─── -->
<BottomSheet
	bind:open={workgroupsSheetOpen}
	title={m.settings_workgroups()}
	subtitle="Pick the role(s) you'd accept."
>
	<div class="sheet-picker">
		{#each knownWorkgroups as w (w.workgroupId)}
			{@const active = workgroupIds.includes(w.workgroupId)}
			<button
				type="button"
				class="sheet-opt"
				class:active
				onclick={() => toggleWorkgroup(w.workgroupId)}
			>
				<span class="sheet-opt-icon">👤</span>
				<span class="sheet-opt-text">
					<span class="sheet-opt-name">{w.name}</span>
					<span class="sheet-opt-desc">#{w.workgroupId}</span>
				</span>
				<span class="sheet-check" class:on={active}>{active ? '✓' : ''}</span>
			</button>
		{/each}
	</div>
	<div class="sheet-actions">
		<button type="button" class="sheet-done" onclick={() => (workgroupsSheetOpen = false)}
			>Done</button
		>
	</div>
</BottomSheet>

<!-- ─── Override sheet ─── -->
<BottomSheet
	bind:open={overrideSheetOpen}
	title={overrideDraft?.id ? m.settings_special_days() : m.settings_special_add()}
	subtitle={m.settings_special_days_hint()}
>
	{#if overrideDraft}
		<form
			method="POST"
			action="?/saveOverride"
			use:enhance={() => {
				overrideSubmitting = true;
				return async ({ update, result }) => {
					await update({ reset: false });
					overrideSubmitting = false;
					if (result.type === 'success') {
						overrideSheetOpen = false;
						overrideDraft = null;
					}
				};
			}}
		>
			{#if overrideDraft.id}<input type="hidden" name="id" value={overrideDraft.id} />{/if}
			<input type="hidden" name="kind" value={overrideDraft.kind} />
			<input type="hidden" name="slots" value={JSON.stringify(overrideDraft.slots)} />

			<label class="field">
				<span class="field-label">{m.override_date()}</span>
				<input type="date" name="date" min={today} required bind:value={overrideDraft.date} />
			</label>

			<div class="seg">
				<button
					type="button"
					class="seg-btn"
					class:active={overrideDraft.kind === 'available'}
					onclick={() => (overrideDraft = { ...overrideDraft!, kind: 'available' })}
				>
					{m.override_kind_available()}
				</button>
				<button
					type="button"
					class="seg-btn"
					class:active={overrideDraft.kind === 'unavailable'}
					onclick={() => (overrideDraft = { ...overrideDraft!, kind: 'unavailable' })}
				>
					{m.override_kind_unavailable()}
				</button>
			</div>

			{#if overrideDraft.kind === 'available'}
				<div class="day-slots day-slots-flat">
					{#each overrideDraft.slots as slot, i (i)}
						<div class="slot-row">
							<input
								type="time"
								min="07:00"
								max="23:00"
								step="900"
								value={minutesToHHMM(slot.start)}
								onchange={(e) =>
									updateOverrideSlot(i, 'start', (e.currentTarget as HTMLInputElement).value)}
							/>
							<span class="slot-sep">–</span>
							<input
								type="time"
								min="07:00"
								max="23:00"
								step="900"
								value={minutesToHHMM(slot.end)}
								onchange={(e) =>
									updateOverrideSlot(i, 'end', (e.currentTarget as HTMLInputElement).value)}
							/>
							<button
								type="button"
								class="slot-remove"
								aria-label={m.settings_remove_slot()}
								onclick={() => removeOverrideSlot(i)}
							>
								<X size={16} strokeWidth={1.8} />
							</button>
						</div>
					{/each}
					{#if dayHasError(overrideDraft.slots)}
						<div class="sheet-error">
							{overrideDraft.slots.some((s) => s.end <= s.start)
								? m.settings_slot_invalid()
								: m.settings_slot_overlap()}
						</div>
					{/if}
					<button type="button" class="slot-add" onclick={addOverrideSlot}>
						<Plus size={14} strokeWidth={2} />
						{m.settings_add_slot()}
					</button>
				</div>
			{/if}

			<label class="field">
				<span class="field-label">{m.override_note()}</span>
				<input
					type="text"
					name="note"
					maxlength="120"
					placeholder={m.override_note_placeholder()}
					bind:value={overrideDraft.note}
				/>
			</label>

			<div class="sheet-actions sheet-actions-row">
				{#if overrideDraft.id}
					<button type="submit" formaction="?/deleteOverride" class="sheet-cancel sheet-danger">
						<Trash2 size={14} strokeWidth={1.8} />
						{m.override_delete()}
					</button>
				{:else}
					<button
						type="button"
						class="sheet-cancel"
						onclick={() => {
							overrideSheetOpen = false;
							overrideDraft = null;
						}}
					>
						{m.override_cancel()}
					</button>
				{/if}
				<button
					type="submit"
					class="sheet-done"
					disabled={overrideSubmitting || !overrideSlotsValid || !overrideDraft.date}
				>
					{m.override_save()}
				</button>
			</div>
		</form>
	{/if}
</BottomSheet>

<!-- ─── Connect sheet ─── -->
<BottomSheet bind:open={connectOpen} title={m.settings_connect()} subtitle={m.connect_disclaimer()}>
	{@const connectError =
		form?.error === 'INVALID_CREDENTIALS' ||
		form?.error === 'CONNECT_FAILED' ||
		form?.error === 'NO_EMPLOYEE_ID'}
	<form
		method="POST"
		action="?/connect"
		use:enhance={() => {
			connecting = true;
			return async ({ update, result }) => {
				await update({ reset: false });
				connecting = false;
				if (result.type === 'success') connectOpen = false;
			};
		}}
	>
		<label class="field">
			<span class="field-label">{m.connect_username()}</span>
			<input
				type="text"
				name="username"
				autocomplete="username"
				aria-invalid={connectError || undefined}
				class:invalid={connectError}
				required
			/>
		</label>
		<label class="field">
			<span class="field-label">{m.connect_password()}</span>
			<input
				type="password"
				name="password"
				autocomplete="current-password"
				aria-invalid={connectError || undefined}
				class:invalid={connectError}
				required
			/>
		</label>
		<div class="field-error-slot" aria-live="polite">
			{#if form?.error === 'INVALID_CREDENTIALS'}
				<div class="field-error">{m.err_invalid_credentials()}</div>
			{:else if form?.error === 'CONNECT_FAILED' || form?.error === 'NO_EMPLOYEE_ID'}
				<div class="field-error">{m.err_connect_failed()}</div>
			{/if}
		</div>
		<div class="sheet-actions sheet-actions-row">
			<button type="button" class="sheet-cancel" onclick={() => (connectOpen = false)}>
				{m.connect_cancel()}
			</button>
			<button type="submit" class="sheet-done" disabled={connecting}>{m.connect_submit()}</button>
		</div>
	</form>
</BottomSheet>

<!-- ─── Unsaved changes ─── -->
<BottomSheet
	bind:open={unsavedSheetOpen}
	title="Unsaved changes"
	subtitle="You have settings that haven't been saved yet."
>
	<div class="unsaved-actions">
		<button
			type="submit"
			form="prefs-form"
			class="unsaved-btn save"
			onclick={() => (unsavedSheetOpen = false)}
		>
			Save & stay
		</button>
		<button type="button" class="unsaved-btn discard" onclick={discardAndGo}>Discard & leave</button
		>
	</div>
</BottomSheet>

<style>
	.page {
		padding: 4px 0 12px;
	}
	.page.has-save-bar {
		padding-bottom: 76px;
	}

	.header {
		padding: 4px 2px 16px;
	}
	.title {
		font-size: 26px;
		font-weight: 600;
		letter-spacing: -0.025em;
		margin: 0;
	}
	.subtitle {
		font-size: 13px;
		color: var(--color-text-subtle);
		margin: 4px 0 0;
	}

	.banner button {
		margin-left: auto;
		font-size: 12px;
		font-weight: 600;
		background: none;
		border: none;
		color: inherit;
		text-decoration: underline;
		cursor: pointer;
	}

	.sl-right-err {
		color: var(--err);
	}

	/* In-card sub-section divider for special days */
	.row-divider {
		display: flex;
		align-items: center;
		padding: 10px 16px 4px;
		border-top: 1px solid var(--color-border-subtle);
		background: var(--color-bg-2);
	}
	.row-divider-label {
		font-size: 10.5px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-text-faint);
	}

	/* Add-row uses dashed visual to telegraph "create" */
	.add-row .sr-label {
		color: var(--color-accent);
		font-weight: 600;
	}

	/* Long override descriptions (slots + note) need to truncate */
	:global(.set-row .sr-desc.sr-desc-trim) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	/* Section label must wrap and shrink instead of overflowing horizontally */
	:global(.section-label) {
		flex-wrap: wrap;
		min-width: 0;
	}
	:global(.section-label .sl-title) {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	:global(.set-row .sr-value.sr-value-trim) {
		max-width: 160px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	:global(.set-row .sr-icon.sr-icon-accent) {
		background: color-mix(in oklab, var(--color-accent) 12%, var(--color-bg-1));
		color: var(--color-accent);
	}
	:global(.set-row .sr-icon.sr-icon-ok) {
		background: color-mix(in oklab, var(--ok) 14%, var(--color-bg-1));
		color: var(--ok);
	}
	:global(.set-row .sr-icon.sr-icon-err) {
		background: color-mix(in oklab, var(--err) 14%, var(--color-bg-1));
		color: var(--err);
	}
	:global(.set-row .sr-icon.sr-icon-danger) {
		background: color-mix(in oklab, var(--err) 10%, var(--color-bg-1));
		color: var(--err);
	}

	.disconnect-form {
		display: contents;
	}
	.danger-row .sr-label {
		color: var(--err);
	}

	/* ─── Schedule accordion ─── */
	.schedule-list {
		display: flex;
		flex-direction: column;
		background: var(--color-bg-1);
		border-radius: var(--radius-md, 12px);
		overflow: hidden;
		margin-bottom: 4px;
	}
	.day-block {
		border-bottom: 1px solid var(--color-border-subtle);
	}
	.day-block:last-child {
		border-bottom: none;
	}
	.day-block.sunday {
		opacity: 0.55;
	}
	.day-header {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 14px 16px;
		background: transparent;
		border: none;
		font: inherit;
		text-align: left;
		cursor: pointer;
		color: inherit;
	}
	.day-header:disabled {
		cursor: default;
	}
	.day-name {
		font-size: 14px;
		font-weight: 600;
		flex-shrink: 0;
		min-width: 56px;
	}
	.day-summary {
		flex: 1;
		font-size: 13px;
		color: var(--color-text-subtle);
		font-variant-numeric: tabular-nums;
	}
	.day-summary.err {
		color: var(--err);
	}
	.day-chev {
		display: flex;
		align-items: center;
		color: var(--color-text-faint);
		transition: transform 150ms ease;
	}
	.day-chev.open {
		transform: rotate(180deg);
	}
	.day-slots {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 4px 16px 14px;
	}
	.day-slots-flat {
		padding: 6px 0 14px;
	}
	.slot-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.slot-row input[type='time'] {
		flex: 1;
		padding: 10px 12px;
		font-size: 16px;
		font-variant-numeric: tabular-nums;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md, 12px);
		background: var(--color-surface-1);
	}
	.slot-sep {
		color: var(--color-text-subtle);
		font-size: 14px;
	}
	.slot-remove {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-md, 12px);
		background: transparent;
		border: 1px solid var(--color-border-default);
		color: var(--color-text-subtle);
		cursor: pointer;
		flex-shrink: 0;
	}
	.slot-remove:active {
		background: var(--color-bg-2);
	}
	.slot-add {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		align-self: flex-start;
		background: transparent;
		border: 1px dashed var(--color-border-default);
		color: var(--color-accent);
		padding: 8px 12px;
		border-radius: var(--radius-md, 12px);
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}

	/* ─── Length pick ─── */
	.length-display {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin: 4px 0 18px;
	}
	.length-display-val {
		font-size: 36px;
		font-weight: 700;
		letter-spacing: -0.03em;
		color: var(--color-accent);
		font-variant-numeric: tabular-nums;
	}
	.length-display-cap {
		font-family: var(--font-mono);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-text-faint);
	}
	.length-slider {
		width: 100%;
		appearance: none;
		-webkit-appearance: none;
		height: 6px;
		background: var(--color-bg-2);
		border-radius: 999px;
		outline: none;
		margin: 4px 0 8px;
	}
	.length-slider::-webkit-slider-thumb {
		appearance: none;
		-webkit-appearance: none;
		width: 24px;
		height: 24px;
		background: var(--color-accent);
		border-radius: 999px;
		border: 3px solid var(--color-surface-1);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
		cursor: pointer;
	}
	.length-slider::-moz-range-thumb {
		width: 24px;
		height: 24px;
		background: var(--color-accent);
		border-radius: 999px;
		border: 3px solid var(--color-surface-1);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
		cursor: pointer;
	}
	.length-axis {
		display: flex;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: 10px;
		color: var(--color-text-faint);
		letter-spacing: 0.04em;
	}

	/* ─── Sheet picker ─── */
	.sheet-picker {
		display: flex;
		flex-direction: column;
		background: var(--color-bg-1);
		border-radius: var(--radius-md, 12px);
		overflow: hidden;
		margin-bottom: 4px;
	}
	.sheet-opt {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border: none;
		background: transparent;
		font: inherit;
		text-align: left;
		cursor: pointer;
		border-bottom: 1px solid var(--color-border-subtle);
		transition: background 120ms ease;
	}
	.sheet-opt:last-child {
		border-bottom: none;
	}
	.sheet-opt:active {
		background: var(--color-bg-2);
	}
	.sheet-opt-icon {
		font-size: 16px;
		width: 28px;
		text-align: center;
		flex-shrink: 0;
	}
	.sheet-opt-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.sheet-opt-name {
		font-size: 14px;
		font-weight: 500;
	}
	.sheet-opt-desc {
		font-size: 11.5px;
		color: var(--color-text-subtle);
	}
	.sheet-check {
		width: 22px;
		height: 22px;
		border-radius: 999px;
		border: 1.5px solid var(--color-border-default);
		display: grid;
		place-items: center;
		font-size: 12px;
		font-weight: 700;
		color: transparent;
		flex-shrink: 0;
		transition: all 120ms ease;
	}
	.sheet-check.on {
		background: var(--color-accent);
		border-color: var(--color-accent);
		color: #fff;
	}
	.sheet-opt.active .sheet-opt-name {
		color: var(--color-accent);
		font-weight: 600;
	}

	/* ─── Segmented control (override kind) ─── */
	.seg {
		display: flex;
		gap: 4px;
		padding: 4px;
		background: var(--color-bg-2);
		border-radius: var(--radius-md, 12px);
		margin-bottom: 14px;
	}
	.seg-btn {
		flex: 1;
		height: 38px;
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		border: none;
		background: transparent;
		color: var(--color-text-subtle);
		border-radius: 8px;
		cursor: pointer;
	}
	.seg-btn.active {
		background: var(--color-surface-1);
		color: var(--color-accent);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}

	/* ─── Field (forms) ─── */
	.field {
		display: block;
		margin-bottom: 14px;
	}
	.field-label {
		display: block;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-subtle);
		margin-bottom: 6px;
	}
	.field input {
		width: 100%;
		padding: 12px;
		font-size: 14px;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md, 12px);
		background: var(--color-surface-1);
	}
	.field input.invalid,
	.field input[aria-invalid='true'] {
		border-color: var(--err);
		box-shadow: 0 0 0 1px var(--err);
	}
	.field-error-slot {
		min-height: 20px;
		margin: -6px 0 8px;
	}
	.field-error {
		font-size: 13px;
		color: var(--err);
	}

	.sheet-error {
		font-size: 12px;
		color: var(--err);
	}

	/* ─── Sheet actions ─── */
	.sheet-actions {
		padding: 14px 0 4px;
	}
	.sheet-actions-row {
		display: flex;
		gap: 8px;
	}
	.sheet-done {
		flex: 1;
		width: 100%;
		height: 48px;
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		border-radius: var(--radius-md, 12px);
		border: none;
		background: var(--color-accent);
		color: #fff;
		cursor: pointer;
		transition: opacity 150ms ease;
	}
	.sheet-done:active:not(:disabled) {
		opacity: 0.85;
	}
	.sheet-done:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.sheet-cancel {
		flex: 1;
		height: 48px;
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		border-radius: var(--radius-md, 12px);
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-1);
		color: var(--color-text);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}
	.sheet-cancel.sheet-danger {
		color: var(--err);
		border-color: color-mix(in oklab, var(--err) 30%, var(--color-border-default));
	}

	/* ─── Unsaved sheet ─── */
	.unsaved-actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.unsaved-btn {
		width: 100%;
		height: 48px;
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		border-radius: var(--radius-md, 12px);
		border: none;
		cursor: pointer;
	}
	.unsaved-btn.save {
		background: var(--color-accent);
		color: #fff;
	}
	.unsaved-btn.discard {
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-default);
		color: var(--color-text-muted);
	}
</style>
