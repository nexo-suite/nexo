<script lang="ts">
	import { untrack } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { enhance } from '$app/forms';
	import { BottomSheet, PageHeader, SaveBar, Toggle, UnsavedGuard } from '@nexo/ui';
	import { Check, Plus, Trash2, X } from '@lucide/svelte';
	import type { WeeklySlot, WeeklyWindows } from '@nexo/db';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';

	let { data, form } = $props();

	type DayKey = '1' | '2' | '3' | '4' | '5' | '6' | '7';

	const SHIFT_OPEN_MIN = 420; // 07:00
	const SHIFT_CLOSE_MIN = 1380; // 23:00
	const MIN_SLOT = SHIFT_OPEN_MIN / 30; // 14
	const MAX_SLOT = SHIFT_CLOSE_MIN / 30; // 46
	const TOTAL_SLOTS = 48;
	const DEFAULT_SLOT: WeeklySlot = { start: 1020, end: 1320 }; // 17:00–22:00

	const DAYS: { value: 1 | 2 | 3 | 4 | 5 | 6; key: DayKey }[] = [
		{ value: 1, key: '1' },
		{ value: 2, key: '2' },
		{ value: 3, key: '3' },
		{ value: 4, key: '4' },
		{ value: 5, key: '5' },
		{ value: 6, key: '6' }
	];

	const dayShort = $derived([
		m.days_mon(),
		m.days_tue(),
		m.days_wed(),
		m.days_thu(),
		m.days_fri(),
		m.days_sat()
	]);

	function cloneSlots(s: WeeklySlot[]): WeeklySlot[] {
		return s.map((x) => ({ ...x }));
	}

	function slotsEqual(a: WeeklySlot[], b: WeeklySlot[]): boolean {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (a[i].start !== b[i].start || a[i].end !== b[i].end) return false;
		}
		return true;
	}

	// Derive a sensible "shared" template from server data: pick the slots of
	// the first day that has any, otherwise fall back to DEFAULT_SLOT.
	function deriveShared(w: WeeklyWindows): WeeklySlot[] {
		for (const d of DAYS) {
			if (w[d.key].length > 0) return cloneSlots(w[d.key]);
		}
		return [{ ...DEFAULT_SLOT }];
	}

	function deriveDayOn(w: WeeklyWindows): Record<DayKey, boolean> {
		return {
			'1': w['1'].length > 0,
			'2': w['2'].length > 0,
			'3': w['3'].length > 0,
			'4': w['4'].length > 0,
			'5': w['5'].length > 0,
			'6': w['6'].length > 0,
			'7': false
		};
	}

	function deriveDayOverrides(
		w: WeeklyWindows,
		shared: WeeklySlot[]
	): Record<DayKey, WeeklySlot[] | null> {
		const out: Record<DayKey, WeeklySlot[] | null> = {
			'1': null,
			'2': null,
			'3': null,
			'4': null,
			'5': null,
			'6': null,
			'7': null
		};
		for (const d of DAYS) {
			const slots = w[d.key];
			if (slots.length === 0) {
				out[d.key] = null; // off — shared doesn't apply
			} else if (slotsEqual(slots, shared)) {
				out[d.key] = null;
			} else {
				out[d.key] = cloneSlots(slots);
			}
		}
		return out;
	}

	function buildWeeklyWindows(
		dayOn: Record<DayKey, boolean>,
		shared: WeeklySlot[],
		overrides: Record<DayKey, WeeklySlot[] | null>
	): WeeklyWindows {
		const out: WeeklyWindows = {
			'1': [],
			'2': [],
			'3': [],
			'4': [],
			'5': [],
			'6': [],
			'7': []
		};
		for (const d of DAYS) {
			if (!dayOn[d.key]) continue;
			const ov = overrides[d.key];
			out[d.key] = ov ? cloneSlots(ov) : cloneSlots(shared);
		}
		return out;
	}

	// ─── State ───
	let enabled = $state(untrack(() => data.prefs.enabled));
	let warehouseIds = $state<number[]>(untrack(() => [...data.prefs.warehouseIds]));
	let workgroupIds = $state<number[]>(untrack(() => [...data.prefs.workgroupIds]));
	let shiftMinMinutes = $state(untrack(() => data.prefs.shiftMinMinutes));
	let shiftMaxMinutes = $state(untrack(() => data.prefs.shiftMaxMinutes));
	let advanceNoticeMinutes = $state(untrack(() => data.prefs.advanceNoticeMinutes));
	let includeMarketplace = $state(untrack(() => data.prefs.includeMarketplace));

	let sharedWindows = $state<WeeklySlot[]>(untrack(() => deriveShared(data.prefs.weeklyWindows)));
	let dayOn = $state<Record<DayKey, boolean>>(untrack(() => deriveDayOn(data.prefs.weeklyWindows)));
	let dayOverrides = $state<Record<DayKey, WeeklySlot[] | null>>(
		untrack(() =>
			deriveDayOverrides(data.prefs.weeklyWindows, deriveShared(data.prefs.weeklyWindows))
		)
	);

	// ─── Sheets ───
	let daySheetOpen = $state(false);
	let daySheetDay = $state<DayKey | null>(null);
	let daySheetSlots = $state<WeeklySlot[]>([]);

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
	let confirmDeleteOverride = $state(false);

	// ─── Derived ───
	const weeklyWindows = $derived(buildWeeklyWindows(dayOn, sharedWindows, dayOverrides));

	// Canonical stringify: stable across object-key order. Postgres jsonb
	// reorders keys (shorter first, then alphabetical), so a slot stored
	// locally as {start,end} comes back as {end,start} — plain JSON.stringify
	// would treat the saved+roundtripped state as different from the local
	// one and leave the save bar permanently visible.
	function stableStringify(v: unknown): string {
		if (v === null || typeof v !== 'object') return JSON.stringify(v);
		if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
		const obj = v as Record<string, unknown>;
		const keys = Object.keys(obj).sort();
		return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
	}

	const dirty = $derived.by(() => {
		const cur = stableStringify({
			enabled,
			weeklyWindows,
			warehouseIds: [...warehouseIds].sort((a, b) => a - b),
			workgroupIds: [...workgroupIds].sort((a, b) => a - b),
			shiftMinMinutes,
			shiftMaxMinutes,
			advanceNoticeMinutes,
			includeMarketplace
		});
		const init = stableStringify({
			enabled: data.prefs.enabled,
			weeklyWindows: data.prefs.weeklyWindows,
			warehouseIds: [...data.prefs.warehouseIds].sort((a, b) => a - b),
			workgroupIds: [...data.prefs.workgroupIds].sort((a, b) => a - b),
			shiftMinMinutes: data.prefs.shiftMinMinutes,
			shiftMaxMinutes: data.prefs.shiftMaxMinutes,
			advanceNoticeMinutes: data.prefs.advanceNoticeMinutes,
			includeMarketplace: data.prefs.includeMarketplace
		});
		return cur !== init;
	});

	const sharedHasError = $derived(slotsHaveError(sharedWindows));
	const overridesHaveError = $derived(
		DAYS.some((d) => {
			const ov = dayOverrides[d.key];
			return ov ? slotsHaveError(ov) : false;
		})
	);
	const scheduleHasError = $derived(sharedHasError || overridesHaveError);

	// Warehouse list — server data plus any IDs the user has saved historically
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

	const today = $derived(data.todayBerlin);

	// ─── Density heatmap (synthetic, bimodal: lunch + dinner) ───
	const DENSITY: number[] = (() => {
		const out: number[] = [];
		for (let i = 0; i < TOTAL_SLOTS; i++) {
			if (i < MIN_SLOT) {
				out.push(0);
			} else {
				const lunch = Math.exp(-((i - 22) * (i - 22)) / 8);
				const dinner = Math.exp(-((i - 35) * (i - 35)) / 18);
				out.push(Math.min(0.95, 0.18 + 0.5 * lunch + 0.65 * dinner));
			}
		}
		return out;
	})();

	// ─── Length histogram (synthetic distribution) ───
	const LEN_HIST = [1, 3, 6, 9, 14, 18, 16, 12, 7, 5, 3, 2, 1, 1];

	// ─── Advance-notice contextual copy (English, inline) ───
	const ADV_CTX: [number, string][] = [
		[0, '"hop on the bike right now"'],
		[1, '"15 min head-start"'],
		[2, '"breakfast and go"'],
		[3, '"shower & bike there"'],
		[6, '"morning prep, half day"'],
		[12, '"plan it for tomorrow"'],
		[24, '"a day to think"']
	];
	function ctxFor(h: number): string {
		let copy = ADV_CTX[0][1];
		for (const [threshold, text] of ADV_CTX) {
			if (h >= threshold) copy = text;
		}
		return copy;
	}
	const advHours = $derived(advanceNoticeMinutes / 60);
	const advCtxCopy = $derived(ctxFor(advHours));

	// ─── Match preview ───
	type ToyShift = {
		day: 1 | 2 | 3 | 4 | 5 | 6;
		start: number;
		end: number;
		warehouseId: number;
		advanceMin: number;
	};
	// 19 synthetic shifts spread across Mo-Sa, mostly evening, varied warehouses.
	const TOY_SHIFTS: ToyShift[] = [
		{ day: 1, start: 1020, end: 1260, warehouseId: 3, advanceMin: 240 },
		{ day: 1, start: 1140, end: 1380, warehouseId: 5, advanceMin: 60 },
		{ day: 2, start: 660, end: 900, warehouseId: 3, advanceMin: 1440 },
		{ day: 2, start: 1020, end: 1320, warehouseId: 3, advanceMin: 480 },
		{ day: 2, start: 1140, end: 1380, warehouseId: 7, advanceMin: 30 },
		{ day: 3, start: 1020, end: 1260, warehouseId: 3, advanceMin: 720 },
		{ day: 3, start: 1080, end: 1320, warehouseId: 5, advanceMin: 180 },
		{ day: 4, start: 660, end: 840, warehouseId: 3, advanceMin: 1440 },
		{ day: 4, start: 1020, end: 1320, warehouseId: 3, advanceMin: 360 },
		{ day: 4, start: 1140, end: 1380, warehouseId: 3, advanceMin: 90 },
		{ day: 4, start: 1200, end: 1380, warehouseId: 9, advanceMin: 60 },
		{ day: 5, start: 1020, end: 1260, warehouseId: 3, advanceMin: 480 },
		{ day: 5, start: 1080, end: 1320, warehouseId: 3, advanceMin: 120 },
		{ day: 5, start: 1140, end: 1380, warehouseId: 5, advanceMin: 240 },
		{ day: 6, start: 600, end: 900, warehouseId: 3, advanceMin: 1440 },
		{ day: 6, start: 900, end: 1140, warehouseId: 3, advanceMin: 720 },
		{ day: 6, start: 1080, end: 1320, warehouseId: 3, advanceMin: 360 },
		{ day: 6, start: 1140, end: 1380, warehouseId: 5, advanceMin: 180 },
		{ day: 6, start: 1200, end: 1380, warehouseId: 3, advanceMin: 60 }
	];

	const matchHits = $derived.by(() => {
		const days: ('hit' | 'miss')[][] = [[], [], [], [], [], []];
		let totalHits = 0;
		for (const s of TOY_SHIFTS) {
			const dayKey = String(s.day) as DayKey;
			const dayActive = enabled && dayOn[dayKey];
			const slots = dayActive ? (dayOverrides[dayKey] ?? sharedWindows) : ([] as WeeklySlot[]);
			const inWindow = slots.some((w) => s.start >= w.start && s.end <= w.end);
			const warehouseOk = warehouseIds.includes(s.warehouseId);
			const lengthOk = s.end - s.start >= shiftMinMinutes && s.end - s.start <= shiftMaxMinutes;
			const advanceOk = s.advanceMin >= advanceNoticeMinutes;
			const hit = dayActive && warehouseOk && inWindow && lengthOk && advanceOk;
			days[s.day - 1].push(hit ? 'hit' : 'miss');
			if (hit) totalHits++;
		}
		return { days, total: totalHits, of: TOY_SHIFTS.length };
	});

	const matchHint = $derived.by(() => {
		if (warehouseIds.length === 0) return m.match_hint_warehouse();
		if (sharedWindows.length === 0) return m.match_hint_window();
		if (advanceNoticeMinutes >= 720) return m.match_hint_advance();
		return m.match_hint_default();
	});

	// ─── Helpers ───
	function slotsHaveError(slots: WeeklySlot[]): boolean {
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

	function clampMin(v: number): number {
		return Math.max(SHIFT_OPEN_MIN, Math.min(SHIFT_CLOSE_MIN, v));
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

	function slotToReadout(s: WeeklySlot): string {
		return `${minutesToHHMM(s.start)}–${minutesToHHMM(s.end)}`;
	}

	function slotLengthLabel(s: WeeklySlot): string {
		const minutes = s.end - s.start;
		const h = Math.floor(minutes / 60);
		const min = minutes % 60;
		if (h === 0) return `${min}m`;
		if (min === 0) return `${h}h`;
		return `${h}h${String(min).padStart(2, '0')}`;
	}

	function warehouseShortId(name: string, id: number): string {
		const initials = name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((p) => p[0]?.toUpperCase() ?? '')
			.join('');
		return `${initials || 'WH'}-${String(id).padStart(3, '0')}`;
	}

	function workgroupShortId(name: string, id: number): string {
		const initials = name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((p) => p[0]?.toUpperCase() ?? '')
			.join('');
		return `${initials || 'WG'}-${String(id).padStart(3, '0')}`;
	}

	// ─── Toggle/edit handlers ───
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

	function toggleDay(key: DayKey) {
		const isOn = dayOn[key];
		dayOn = { ...dayOn, [key]: !isOn };
		if (isOn) {
			// turning off — clear any override so shared template applies cleanly when re-enabled
			dayOverrides = { ...dayOverrides, [key]: null };
		}
	}

	// Long-press detection on weekday cell
	let longPressTimer = $state<ReturnType<typeof setTimeout> | null>(null);
	let longPressFired = $state(false);

	function onWeekdayPointerDown(e: PointerEvent, key: DayKey) {
		// Block the OS's long-press text selection from bleeding into the page.
		e.preventDefault();
		longPressFired = false;
		clearTimer();
		longPressTimer = setTimeout(() => {
			longPressFired = true;
			openDaySheet(key);
			if (typeof navigator !== 'undefined' && navigator.vibrate) {
				try {
					navigator.vibrate(8);
				} catch {
					// ignore
				}
			}
		}, 450);
	}
	function onWeekdayPointerEnd() {
		clearTimer();
	}
	function onWeekdayClick(key: DayKey) {
		if (longPressFired) {
			longPressFired = false;
			return;
		}
		toggleDay(key);
	}
	function clearTimer() {
		if (longPressTimer) {
			clearTimeout(longPressTimer);
			longPressTimer = null;
		}
	}

	function openDaySheet(key: DayKey) {
		daySheetDay = key;
		daySheetSlots = cloneSlots(dayOverrides[key] ?? sharedWindows);
		if (daySheetSlots.length === 0) daySheetSlots = [{ ...DEFAULT_SLOT }];
		daySheetOpen = true;
	}

	function applyDaySheet() {
		if (!daySheetDay) return;
		// If the per-day slots match shared exactly, drop the override.
		const eqShared = slotsEqual(daySheetSlots, sharedWindows);
		dayOverrides = {
			...dayOverrides,
			[daySheetDay]: eqShared ? null : cloneSlots(daySheetSlots)
		};
		dayOn = { ...dayOn, [daySheetDay]: daySheetSlots.length > 0 };
		daySheetOpen = false;
		daySheetDay = null;
	}

	function resetDaySheetToShared() {
		daySheetSlots = cloneSlots(sharedWindows);
	}

	function addDaySheetSlot() {
		const sorted = [...daySheetSlots].sort((a, b) => a.start - b.start);
		const last = sorted[sorted.length - 1];
		let candidate = { ...DEFAULT_SLOT };
		if (last && last.end < SHIFT_CLOSE_MIN) {
			const start = clampMin(last.end);
			const end = clampMin(start + 180);
			if (end > start) candidate = { start, end };
		}
		daySheetSlots = [...daySheetSlots, candidate];
	}
	function removeDaySheetSlot(idx: number) {
		daySheetSlots = daySheetSlots.filter((_, i) => i !== idx);
	}
	function updateDaySheetSlot(idx: number, field: 'start' | 'end', value: string) {
		const mins = clampMin(hhmmToMinutes(value));
		daySheetSlots = daySheetSlots.map((s, i) => (i === idx ? { ...s, [field]: mins } : s));
	}

	// ─── Time rail (multi-window) — drag handles ───
	type DragState = {
		windowIdx: number;
		side: 'l' | 'r';
		railEl: HTMLDivElement;
		railWidth: number;
		railLeft: number;
	};
	let dragState = $state<DragState | null>(null);

	function slotToLR(s: WeeklySlot): { l: number; r: number } {
		return { l: s.start / 30, r: s.end / 30 };
	}
	function lrToSlot(l: number, r: number): WeeklySlot {
		return { start: l * 30, end: r * 30 };
	}

	function setWindow(idx: number, l: number, r: number) {
		const sorted = [...sharedWindows];
		// clamp to MIN_SLOT..MAX_SLOT and avoid neighbour overlap
		const cur = sorted[idx];
		const others = sorted.filter((_, i) => i !== idx).sort((a, b) => a.start - b.start);
		let minL = MIN_SLOT;
		let maxR = MAX_SLOT;
		for (const o of others) {
			const oL = o.start / 30;
			const oR = o.end / 30;
			if (oR <= cur.start / 30) minL = Math.max(minL, oR);
			if (oL >= cur.end / 30) maxR = Math.min(maxR, oL);
		}
		const cl = Math.max(minL, Math.min(MAX_SLOT - 1, l));
		const cr = Math.max(MIN_SLOT + 1, Math.min(maxR, r));
		if (cr <= cl) return;
		sorted[idx] = lrToSlot(cl, cr);
		sharedWindows = sorted.sort((a, b) => a.start - b.start);
	}

	function onHandlePointerDown(e: PointerEvent, windowIdx: number, side: 'l' | 'r') {
		const target = e.currentTarget as HTMLElement;
		const rail = target.closest('.tr-rail') as HTMLDivElement | null;
		if (!rail) return;
		const rect = rail.getBoundingClientRect();
		dragState = {
			windowIdx,
			side,
			railEl: rail,
			railWidth: rect.width,
			railLeft: rect.left
		};
		target.setPointerCapture(e.pointerId);
		target.classList.add('dragging');
		e.preventDefault();
	}

	function onHandlePointerMove(e: PointerEvent) {
		if (!dragState) return;
		const x = e.clientX - dragState.railLeft;
		const slotF = (x / dragState.railWidth) * TOTAL_SLOTS;
		const slot = Math.round(slotF);
		const cur = sharedWindows[dragState.windowIdx];
		if (!cur) return;
		const lr = slotToLR(cur);
		if (dragState.side === 'l') setWindow(dragState.windowIdx, slot, lr.r);
		else setWindow(dragState.windowIdx, lr.l, slot);
	}

	function onHandlePointerUp(e: PointerEvent) {
		const target = e.currentTarget as HTMLElement;
		target.classList.remove('dragging');
		try {
			target.releasePointerCapture(e.pointerId);
		} catch {
			// ignore
		}
		dragState = null;
	}

	function onHandleKeydown(e: KeyboardEvent, windowIdx: number, side: 'l' | 'r') {
		const cur = sharedWindows[windowIdx];
		if (!cur) return;
		const lr = slotToLR(cur);
		const step = e.shiftKey ? 4 : 1;
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			if (side === 'l') setWindow(windowIdx, lr.l - step, lr.r);
			else setWindow(windowIdx, lr.l, lr.r - step);
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			if (side === 'l') setWindow(windowIdx, lr.l + step, lr.r);
			else setWindow(windowIdx, lr.l, lr.r + step);
		}
	}

	function addSharedWindow() {
		// Find first gap ≥ 4 slots wide between windows or against MIN/MAX.
		const sorted = [...sharedWindows].sort((a, b) => a.start - b.start);
		let l = MIN_SLOT;
		for (const s of sorted) {
			const sL = s.start / 30;
			if (sL - l >= 4) {
				sharedWindows = [...sharedWindows, lrToSlot(l, l + 4)].sort((a, b) => a.start - b.start);
				return;
			}
			l = Math.max(l, s.end / 30);
		}
		if (MAX_SLOT - l >= 4) {
			sharedWindows = [...sharedWindows, lrToSlot(l, l + 4)].sort((a, b) => a.start - b.start);
		}
	}

	function removeSharedWindow(idx: number) {
		sharedWindows = sharedWindows.filter((_, i) => i !== idx);
		if (sharedWindows.length === 0) sharedWindows = [{ ...DEFAULT_SLOT }];
	}

	// ─── Length steppers ───
	function bumpMin(delta: number) {
		const next = Math.max(0, Math.min(shiftMaxMinutes, shiftMinMinutes + delta * 60));
		shiftMinMinutes = next;
	}
	function bumpMax(delta: number) {
		const next = Math.max(shiftMinMinutes, Math.min(600, shiftMaxMinutes + delta * 60));
		shiftMaxMinutes = next;
	}

	// ─── Advance slider ───
	let advDragging = $state(false);
	function onAdvPointerDown(e: PointerEvent) {
		const rail = e.currentTarget as HTMLDivElement;
		const rect = rail.getBoundingClientRect();
		rail.setPointerCapture(e.pointerId);
		advDragging = true;
		setAdvFromX(e.clientX - rect.left, rect.width);
		(rail as HTMLElement).dataset.left = String(rect.left);
		(rail as HTMLElement).dataset.width = String(rect.width);
		e.preventDefault();
	}
	function onAdvPointerMove(e: PointerEvent) {
		if (!advDragging) return;
		const rail = e.currentTarget as HTMLDivElement;
		const left = Number(rail.dataset.left ?? rail.getBoundingClientRect().left);
		const width = Number(rail.dataset.width ?? rail.getBoundingClientRect().width);
		setAdvFromX(e.clientX - left, width);
	}
	function onAdvPointerUp(e: PointerEvent) {
		advDragging = false;
		try {
			(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
		} catch {
			// ignore
		}
	}
	function setAdvFromX(x: number, width: number) {
		const ratio = Math.max(0, Math.min(1, x / width));
		const hours = ratio * 24;
		// snap to 15 minute intervals
		const minutes = Math.round((hours * 60) / 15) * 15;
		advanceNoticeMinutes = Math.max(0, Math.min(1440, minutes));
	}

	// ─── Per-date overrides ───
	function openNewOverride() {
		overrideDraft = {
			id: null,
			date: today,
			kind: 'available',
			slots: [{ ...DEFAULT_SLOT }],
			note: ''
		};
		confirmDeleteOverride = false;
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
		confirmDeleteOverride = false;
		overrideSheetOpen = true;
	}
	function addOverrideSlot() {
		if (!overrideDraft) return;
		const sorted = [...overrideDraft.slots].sort((a, b) => a.start - b.start);
		const last = sorted[sorted.length - 1];
		let candidate = { ...DEFAULT_SLOT };
		if (last && last.end < SHIFT_CLOSE_MIN) {
			const start = clampMin(last.end);
			const end = clampMin(start + 180);
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
		const mins = clampMin(hhmmToMinutes(value));
		overrideDraft = {
			...overrideDraft,
			slots: overrideDraft.slots.map((s, i) => (i === idx ? { ...s, [field]: mins } : s))
		};
	}
	const overrideSlotsValid = $derived.by(() => {
		if (!overrideDraft) return true;
		if (overrideDraft.kind !== 'available') return true;
		if (overrideDraft.slots.length === 0) return false;
		return !slotsHaveError(overrideDraft.slots);
	});

	function resetPrefsToServer() {
		const w = data.prefs.weeklyWindows;
		const shared = deriveShared(w);
		enabled = data.prefs.enabled;
		warehouseIds = [...data.prefs.warehouseIds];
		workgroupIds = [...data.prefs.workgroupIds];
		shiftMinMinutes = data.prefs.shiftMinMinutes;
		shiftMaxMinutes = data.prefs.shiftMaxMinutes;
		advanceNoticeMinutes = data.prefs.advanceNoticeMinutes;
		includeMarketplace = data.prefs.includeMarketplace;
		sharedWindows = shared;
		dayOn = deriveDayOn(w);
		dayOverrides = deriveDayOverrides(w, shared);
	}
</script>

<div class="page" class:has-save-bar={dirty && !scheduleHasError}>
	<PageHeader title={m.nav_filters()} subtitle={m.filters_subtitle()}>
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
	</PageHeader>

	{#if form?.success}
		<div class="sr-saved" aria-live="polite">{m.toast_saved()}</div>
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
		<input type="hidden" name="shiftMinMinutes" value={shiftMinMinutes} />
		<input type="hidden" name="shiftMaxMinutes" value={shiftMaxMinutes} />
		<input type="hidden" name="advanceNoticeMinutes" value={advanceNoticeMinutes} />
		{#if enabled}<input type="hidden" name="enabled" value="on" />{/if}
		{#if includeMarketplace}<input type="hidden" name="includeMarketplace" value="on" />{/if}

		<!-- Match preview -->
		<section class="preview-card" aria-live="polite">
			<div class="lbl">{m.match_eyebrow()}</div>
			<div class="num">
				<span class="big">{matchHits.total}</span>
				<span class="of">{m.match_of_n({ count: matchHits.of })}</span>
			</div>
			<div class="copy">{matchHint}</div>
			<div class="timeline" aria-hidden="true">
				{#each dayShort as label, idx (idx)}
					<div class="day">
						<div class="col">
							{#each matchHits.days[idx] as kind, j (j)}
								<span class="pip {kind}"></span>
							{/each}
						</div>
						<div class="lbl-d">{label}</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Master switch -->
		<section class="filter-card">
			<div class="sr-row">
				<div class="sr-text">
					<div class="sr-title">{m.settings_polling_enabled()}</div>
					<div class="sr-desc">{m.settings_polling_hint()}</div>
				</div>
				<div class="sw-slot">
					<Toggle bind:checked={enabled} ariaLabel={m.settings_polling_enabled()} />
				</div>
			</div>
		</section>

		<!-- Warehouses -->
		<section class="filter-card">
			<div class="head">
				<div class="l">
					<div class="ttl">{m.settings_warehouses()}</div>
					<div class="desc">{m.filters_warehouses_subtitle()}</div>
				</div>
				<div class="rt">{warehouseIds.length}/{knownWarehouses.length}</div>
			</div>
			<div class="body">
				<div class="wh-chips" role="group" aria-label={m.settings_warehouses()}>
					{#each knownWarehouses as w (w.warehouseId)}
						<button
							type="button"
							class="wh-chip"
							class:on={warehouseIds.includes(w.warehouseId)}
							aria-pressed={warehouseIds.includes(w.warehouseId)}
							onclick={() => toggleWarehouse(w.warehouseId)}
						>
							{w.name}
							<span class="id">{warehouseShortId(w.name, w.warehouseId)}</span>
						</button>
					{/each}
				</div>
			</div>
		</section>

		<!-- Workgroups -->
		<section class="filter-card">
			<div class="head">
				<div class="l">
					<div class="ttl">{m.settings_workgroups()}</div>
					<div class="desc">{m.filters_workgroups_subtitle()}</div>
				</div>
				<div class="rt">{workgroupIds.length}/{knownWorkgroups.length}</div>
			</div>
			<div class="body">
				<div class="wh-chips" role="group" aria-label={m.settings_workgroups()}>
					{#each knownWorkgroups as wg (wg.workgroupId)}
						<button
							type="button"
							class="wh-chip"
							class:on={workgroupIds.includes(wg.workgroupId)}
							aria-pressed={workgroupIds.includes(wg.workgroupId)}
							onclick={() => toggleWorkgroup(wg.workgroupId)}
						>
							{wg.name}
							<span class="id">{workgroupShortId(wg.name, wg.workgroupId)}</span>
						</button>
					{/each}
				</div>
			</div>
		</section>

		<!-- Weekday grid -->
		<section class="filter-card">
			<div class="head">
				<div class="l">
					<div class="ttl">{m.filters_weekdays_title()}</div>
					<div class="desc">{m.filters_weekdays_desc()}</div>
				</div>
				<div class="rt">
					{DAYS.filter((d) => dayOn[d.key]).length}/6
				</div>
			</div>
			<div class="body">
				<div class="wk-grid">
					{#each DAYS as d, idx (d.value)}
						{@const overridden = dayOverrides[d.key] !== null && dayOn[d.key]}
						<button
							type="button"
							class="wk-cell"
							class:on={dayOn[d.key]}
							class:override={overridden}
							aria-pressed={dayOn[d.key]}
							aria-label={dayShort[idx]}
							onpointerdown={(e) => onWeekdayPointerDown(e, d.key)}
							onpointerup={onWeekdayPointerEnd}
							onpointercancel={onWeekdayPointerEnd}
							onpointerleave={onWeekdayPointerEnd}
							oncontextmenu={(e) => {
								e.preventDefault();
								openDaySheet(d.key);
							}}
							onclick={() => onWeekdayClick(d.key)}
						>
							<span class="d">{dayShort[idx]}</span>
							<span class="h">
								{#each (dayOverrides[d.key] ?? sharedWindows).slice(0, 2) as s, si (si)}
									{#if dayOn[d.key]}
										<span>{slotToReadout(s)}</span>
									{:else if si === 0}
										<span>{m.settings_day_off()}</span>
									{/if}
								{/each}
								{#if dayOn[d.key] && (dayOverrides[d.key] ?? sharedWindows).length === 0}
									<span>{m.settings_day_off()}</span>
								{/if}
							</span>
						</button>
					{/each}
				</div>
				<p class="wk-hint">
					<b>{m.filters_weekday_hint_strong()}</b>
					{m.filters_weekday_hint_rest()}
				</p>
			</div>
		</section>

		<!-- Time-of-day rail (multi-window) -->
		<section class="filter-card">
			<div class="head">
				<div class="l">
					<div class="ttl">{m.filters_time_window_title()}</div>
					<div class="desc">{m.filters_time_window_desc()}</div>
				</div>
				<div class="rt">{sharedWindows.length}×</div>
			</div>
			<div class="body">
				<div class="tr-stack">
					{#each sharedWindows as s, idx (idx)}
						{@const lr = slotToLR(s)}
						{@const lPct = (lr.l / TOTAL_SLOTS) * 100}
						{@const rPct = (lr.r / TOTAL_SLOTS) * 100}
						<div class="tr-item" class:single={sharedWindows.length === 1}>
							<div class="tr-readout">
								<span class="from">{minutesToHHMM(s.start)}</span>
								<span class="dash"></span>
								<span class="to">{minutesToHHMM(s.end)}</span>
								<span class="len">{slotLengthLabel(s)}</span>
								<button
									type="button"
									class="rm"
									aria-label={m.filters_remove_window()}
									onclick={() => removeSharedWindow(idx)}
								>
									<X size={11} strokeWidth={2} />
								</button>
							</div>
							<div class="tr-rail">
								<div class="tr-density" aria-hidden="true">
									{#each DENSITY as d, di (di)}
										<i style="--density: {d}"></i>
									{/each}
								</div>
								<div class="tr-closed" aria-hidden="true"></div>
								<div
									class="tr-sel"
									style="left: {lPct}%; right: {100 - rPct}%"
									aria-hidden="true"
								></div>
								<button
									type="button"
									class="tr-handle"
									style="left: {lPct}%"
									role="slider"
									aria-label={m.filters_handle_start()}
									aria-valuemin={MIN_SLOT}
									aria-valuemax={lr.r - 1}
									aria-valuenow={lr.l}
									onpointerdown={(e) => onHandlePointerDown(e, idx, 'l')}
									onpointermove={onHandlePointerMove}
									onpointerup={onHandlePointerUp}
									onpointercancel={onHandlePointerUp}
									onkeydown={(e) => onHandleKeydown(e, idx, 'l')}
								></button>
								<button
									type="button"
									class="tr-handle"
									style="left: {rPct}%"
									role="slider"
									aria-label={m.filters_handle_end()}
									aria-valuemin={lr.l + 1}
									aria-valuemax={MAX_SLOT}
									aria-valuenow={lr.r}
									onpointerdown={(e) => onHandlePointerDown(e, idx, 'r')}
									onpointermove={onHandlePointerMove}
									onpointerup={onHandlePointerUp}
									onpointercancel={onHandlePointerUp}
									onkeydown={(e) => onHandleKeydown(e, idx, 'r')}
								></button>
							</div>
							<div class="tr-ticks" aria-hidden="true">
								<span>00</span><span>03</span><span>06</span><span>09</span>
								<span>12</span><span>15</span><span>18</span><span>21</span>
							</div>
						</div>
					{/each}
				</div>
				<button
					type="button"
					class="tr-add"
					onclick={addSharedWindow}
					disabled={sharedWindows.length >= 3}
				>
					<Plus size={11} strokeWidth={2} />
					{m.filters_add_window()}
				</button>
				<div class="tr-density-legend">
					<span class="swatch" aria-hidden="true"></span>
					<span>{m.filters_density_legend()}</span>
				</div>
			</div>
		</section>

		<!-- Length stepper + histogram -->
		<section class="filter-card">
			<div class="head">
				<div class="l">
					<div class="ttl">{m.filters_length()}</div>
					<div class="desc">{m.filters_length_hint()}</div>
				</div>
				<div class="rt">
					{Math.round(shiftMinMinutes / 60)}–{Math.round(shiftMaxMinutes / 60)}h
				</div>
			</div>
			<div class="body">
				<div class="len-block">
					<div class="len-pair">
						<div class="len-step">
							<div class="k">{m.filters_min()}</div>
							<div class="ctl">
								<button
									type="button"
									class="btn-num"
									aria-label="−"
									onclick={() => bumpMin(-1)}
									disabled={shiftMinMinutes <= 0}>−</button
								>
								<span class="v">{Math.round(shiftMinMinutes / 60)}</span>
								<span class="u">h</span>
								<button
									type="button"
									class="btn-num"
									aria-label="+"
									onclick={() => bumpMin(1)}
									disabled={shiftMinMinutes >= shiftMaxMinutes - 60}>+</button
								>
							</div>
						</div>
						<div class="len-step">
							<div class="k">{m.filters_max()}</div>
							<div class="ctl">
								<button
									type="button"
									class="btn-num"
									aria-label="−"
									onclick={() => bumpMax(-1)}
									disabled={shiftMaxMinutes <= shiftMinMinutes + 60}>−</button
								>
								<span class="v">{Math.round(shiftMaxMinutes / 60)}</span>
								<span class="u">h</span>
								<button
									type="button"
									class="btn-num"
									aria-label="+"
									onclick={() => bumpMax(1)}
									disabled={shiftMaxMinutes >= 600}>+</button
								>
							</div>
						</div>
					</div>
					<div class="len-hist" aria-hidden="true">
						{#each LEN_HIST as h, i (i)}
							{@const hour = i + 1}
							{@const isIn = hour * 60 >= shiftMinMinutes && hour * 60 <= shiftMaxMinutes}
							<i class:in={isIn} style="height: {(h / 18) * 100}%"></i>
						{/each}
					</div>
					<div class="len-hist-axis" aria-hidden="true">
						{#each Array(14) as _, i (i)}
							<span>{i + 1}h</span>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<!-- Advance notice -->
		<section class="filter-card">
			<div class="head">
				<div class="l">
					<div class="ttl">{m.filters_advance()}</div>
					<div class="desc">{m.filters_advance_hint()}</div>
				</div>
			</div>
			<div class="body">
				<div class="adv-block">
					<div class="adv-readout">
						<span class="v">{Math.floor(advHours)}</span>
						<span class="u">h</span>
						{#if advanceNoticeMinutes % 60 !== 0}
							<span class="v">{advanceNoticeMinutes % 60}</span>
							<span class="u">m</span>
						{/if}
						<span class="ctx">{advCtxCopy}</span>
					</div>
					<div
						class="adv-slider"
						role="slider"
						aria-label={m.filters_advance()}
						aria-valuemin="0"
						aria-valuemax="1440"
						aria-valuenow={advanceNoticeMinutes}
						tabindex="0"
						onpointerdown={onAdvPointerDown}
						onpointermove={onAdvPointerMove}
						onpointerup={onAdvPointerUp}
						onpointercancel={onAdvPointerUp}
						onkeydown={(e) => {
							if (e.key === 'ArrowLeft') {
								e.preventDefault();
								advanceNoticeMinutes = Math.max(0, advanceNoticeMinutes - 15);
							} else if (e.key === 'ArrowRight') {
								e.preventDefault();
								advanceNoticeMinutes = Math.min(1440, advanceNoticeMinutes + 15);
							}
						}}
					>
						<div class="adv-fill" style="width: {(advanceNoticeMinutes / 1440) * 100}%"></div>
						<div
							class="adv-handle"
							style="left: {(advanceNoticeMinutes / 1440) * 100}%"
							aria-hidden="true"
						></div>
					</div>
					<div class="adv-ticks" aria-hidden="true">
						<span>now</span><span>2h</span><span>6h</span><span>12h</span><span>24h</span>
					</div>
				</div>
			</div>
		</section>

		<!-- Marketplace -->
		<section class="filter-card">
			<div class="sr-row">
				<div class="sr-text">
					<div class="sr-title">{m.settings_include_marketplace()}</div>
					<div class="sr-desc">{m.filters_marketplace_desc()}</div>
				</div>
				<div class="sw-slot">
					<Toggle bind:checked={includeMarketplace} ariaLabel={m.settings_include_marketplace()} />
				</div>
			</div>
		</section>

		<!-- Per-date overrides -->
		<section class="filter-card">
			<div class="head">
				<div class="l">
					<div class="ttl">{m.settings_special_days()}</div>
					<div class="desc">{m.settings_special_days_hint()}</div>
				</div>
			</div>
			<div class="body">
				<div class="ov-list">
					{#each data.dateOverrides as o (o.id)}
						<button type="button" class="ov-row" onclick={() => openEditOverride(o)}>
							<span class="date">
								{new Date(o.date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric' })}
								<span>
									{new Date(o.date + 'T00:00:00')
										.toLocaleDateString(undefined, { weekday: 'short' })
										.toUpperCase()}
								</span>
							</span>
							<span class="what">
								{#if o.kind === 'available'}
									<b>{m.override_kind_available()}</b>
									·
									{o.slots.map((s) => slotToReadout(s)).join(', ')}
									{#if o.note}· {o.note}{/if}
								{:else}
									<b>{m.override_kind_unavailable()}</b>
									{#if o.note}· {o.note}{/if}
								{/if}
							</span>
							<span class="badge {o.kind === 'available' ? 'on' : 'off'}">
								{o.kind === 'available' ? 'on' : 'off'}
							</span>
						</button>
					{/each}
					<button type="button" class="ov-add" onclick={openNewOverride}>
						<Plus size={12} strokeWidth={2} />
						{m.settings_special_add()}
					</button>
				</div>
			</div>
		</section>
	</form>
</div>

<SaveBar
	visible={dirty && !scheduleHasError}
	hint={m.unsaved_title()}
	label={m.save_changes()}
	formId="prefs-form"
/>

<!-- Per-day window override sheet -->
<BottomSheet
	bind:open={daySheetOpen}
	title={daySheetDay
		? m.filters_day_sheet_title({ day: dayShort[Number(daySheetDay) - 1] })
		: m.filters_day_sheet_title({ day: '' })}
	subtitle={m.filters_day_sheet_desc()}
>
	<div class="ds-body">
		{#each daySheetSlots as slot, i (i)}
			<div class="slot-row">
				<input
					type="time"
					min="07:00"
					max="23:00"
					step="900"
					value={minutesToHHMM(slot.start)}
					onchange={(e) =>
						updateDaySheetSlot(i, 'start', (e.currentTarget as HTMLInputElement).value)}
				/>
				<span class="slot-sep">–</span>
				<input
					type="time"
					min="07:00"
					max="23:00"
					step="900"
					value={minutesToHHMM(slot.end)}
					onchange={(e) =>
						updateDaySheetSlot(i, 'end', (e.currentTarget as HTMLInputElement).value)}
				/>
				<button
					type="button"
					class="slot-remove"
					aria-label={m.settings_remove_slot()}
					onclick={() => removeDaySheetSlot(i)}
				>
					<X size={16} strokeWidth={1.8} />
				</button>
			</div>
		{/each}
		{#if slotsHaveError(daySheetSlots)}
			<div class="sheet-error">
				{daySheetSlots.some((s) => s.end <= s.start)
					? m.settings_slot_invalid()
					: m.settings_slot_overlap()}
			</div>
		{/if}
		<button type="button" class="slot-add" onclick={addDaySheetSlot}>
			<Plus size={14} strokeWidth={2} />
			{m.settings_add_slot()}
		</button>
		<button type="button" class="ds-reset" onclick={resetDaySheetToShared}>
			{m.filters_day_sheet_reset()}
		</button>
	</div>
	<div class="sheet-actions sheet-actions-row">
		<button
			type="button"
			class="sheet-cancel"
			onclick={() => {
				daySheetOpen = false;
				daySheetDay = null;
			}}
		>
			{m.override_cancel()}
		</button>
		<button
			type="button"
			class="sheet-done"
			onclick={applyDaySheet}
			disabled={slotsHaveError(daySheetSlots)}
		>
			<Check size={14} strokeWidth={1.8} />
			{m.filters_done()}
		</button>
	</div>
</BottomSheet>

<!-- Per-date override editor sheet -->
<BottomSheet
	bind:open={overrideSheetOpen}
	title={confirmDeleteOverride
		? m.override_delete_confirm_title()
		: overrideDraft?.id
			? m.settings_special_days()
			: m.settings_special_add()}
	subtitle={confirmDeleteOverride
		? m.override_delete_confirm_desc()
		: m.settings_special_days_hint()}
>
	{#if overrideDraft}
		{#if confirmDeleteOverride}
			<form
				method="POST"
				action="?/deleteOverride"
				use:enhance={() => {
					overrideSubmitting = true;
					return async ({ update, result }) => {
						await update({ reset: false });
						overrideSubmitting = false;
						if (result.type === 'success') {
							overrideSheetOpen = false;
							overrideDraft = null;
							confirmDeleteOverride = false;
						}
					};
				}}
			>
				<input type="hidden" name="id" value={overrideDraft.id} />
				<div class="sheet-actions sheet-actions-row">
					<button
						type="button"
						class="sheet-cancel"
						onclick={() => (confirmDeleteOverride = false)}
					>
						{m.override_cancel()}
					</button>
					<button type="submit" class="sheet-done sheet-danger" disabled={overrideSubmitting}>
						<Trash2 size={14} strokeWidth={1.8} />
						{m.override_delete_yes()}
					</button>
				</div>
			</form>
		{:else}
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
					<div class="ds-body">
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
						{#if slotsHaveError(overrideDraft.slots)}
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
					{#if overrideDraft.id}
						<button
							type="button"
							class="sheet-cancel sheet-danger"
							onclick={() => (confirmDeleteOverride = true)}
						>
							<Trash2 size={14} strokeWidth={1.8} />
							{m.override_delete()}
						</button>
					{/if}
					<button
						type="submit"
						class="sheet-done"
						disabled={overrideSubmitting || !overrideSlotsValid || !overrideDraft.date}
					>
						<Check size={14} strokeWidth={1.8} />
						{m.override_save()}
					</button>
				</div>
			</form>
		{/if}
	{/if}
</BottomSheet>

<!-- Unsaved changes -->
<UnsavedGuard
	dirty={dirty && !scheduleHasError}
	formId="prefs-form"
	onDiscard={resetPrefsToServer}
	title={m.unsaved_title()}
	description={m.unsaved_desc()}
	saveLabel={m.unsaved_save()}
	discardLabel={m.unsaved_discard()}
/>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.page.has-save-bar {
		padding-bottom: 76px;
	}

	.sr-saved {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	/* Day-sheet body shared with override sheet */
	.ds-body {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 6px 0 12px;
	}

	.slot-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.slot-row input[type='time'] {
		flex: 1;
		min-height: 48px;
		padding: 12px 14px;
		font-size: 16px;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		font-family: var(--font-mono);
		letter-spacing: 0.02em;
		color: var(--text-primary);
		border: 1px solid rgb(255 255 255 / 0.85);
		border-radius: var(--radius-md);
		background: rgb(255 255 255 / 0.65);
		backdrop-filter: blur(14px) saturate(150%);
		-webkit-backdrop-filter: blur(14px) saturate(150%);
		box-shadow: var(--shadow-glass-sm);
	}
	.slot-row input[type='time']:focus {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.slot-sep {
		color: var(--text-subtle);
		font-size: 14px;
	}
	.slot-remove {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-md);
		background: transparent;
		border: 1px solid var(--border-default);
		color: var(--text-subtle);
		cursor: pointer;
		flex-shrink: 0;
	}
	.slot-add {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		align-self: flex-start;
		background: transparent;
		border: 1px dashed var(--border-default);
		color: var(--accent);
		padding: 8px 12px;
		border-radius: var(--radius-md);
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	.ds-reset {
		appearance: none;
		border: 0;
		background: transparent;
		color: var(--text-subtle);
		font-size: 12px;
		text-decoration: underline;
		cursor: pointer;
		align-self: flex-start;
		padding: 4px 0;
	}

	.sheet-error {
		font-size: 12px;
		color: var(--err-ink);
	}

	.sheet-cancel.sheet-danger {
		color: var(--err-ink);
		border-color: color-mix(in oklab, var(--err) 30%, var(--border-default));
	}

	.seg {
		display: flex;
		gap: 4px;
		padding: 5px;
		background: rgb(255 255 255 / 0.5);
		backdrop-filter: blur(14px) saturate(150%);
		-webkit-backdrop-filter: blur(14px) saturate(150%);
		border: 1px solid rgb(255 255 255 / 0.85);
		border-radius: 999px;
		margin-bottom: 14px;
		box-shadow: var(--shadow-glass-sm);
	}
	.seg-btn {
		flex: 1;
		height: 40px;
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		border: none;
		background: transparent;
		color: var(--text-subtle);
		border-radius: 999px;
		cursor: pointer;
		transition: transform 320ms var(--ease-spring);
	}
	.seg-btn:active {
		transform: scale(0.95);
	}
	.seg-btn.active {
		background: linear-gradient(180deg, var(--accent) 0%, var(--accent-deep) 100%);
		color: #fff;
		box-shadow:
			0 4px 10px -4px rgb(124 18 64 / 0.45),
			inset 0 1px 0 rgb(255 255 255 / 0.25);
	}

	.field {
		display: block;
		margin-bottom: 14px;
	}
	.field-label {
		display: block;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-subtle);
		margin-bottom: 6px;
	}
	.field input {
		width: 100%;
		padding: 12px;
		font-size: 14px;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
		background: var(--surface-1);
	}
</style>
