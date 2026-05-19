import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import {
	db,
	flaschenAccount,
	flaschenDateOverride,
	flaschenSeenLocation,
	loadHubProfile,
	type WeeklySlot,
	type WeeklyWindows
} from '@nexo/db';
import { and, asc, eq } from 'drizzle-orm';
import { logger } from '$lib/server/logger';
import {
	loadPrefs,
	savePrefs,
	passwordGrant,
	saveTokens,
	disconnectAccount,
	OAuthError
} from '$lib/server/flaschenpost';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const todayBerlin = new Date(
		new Date().toLocaleString('en-CA', { timeZone: 'Europe/Berlin' }).split(',')[0]
	)
		.toISOString()
		.slice(0, 10);

	const [prefs, account, locations, profile, dateOverrides] = await Promise.all([
		loadPrefs(userId),
		db.select().from(flaschenAccount).where(eq(flaschenAccount.userId, userId)).limit(1),
		db
			.select()
			.from(flaschenSeenLocation)
			.where(eq(flaschenSeenLocation.userId, userId))
			.orderBy(asc(flaschenSeenLocation.warehouseName)),
		loadHubProfile(userId),
		db
			.select()
			.from(flaschenDateOverride)
			.where(
				and(
					eq(flaschenDateOverride.userId, userId)
					// Surface today + future overrides only.
					// Use string comparison since 'date' is YYYY-MM-DD lexicographically sortable.
					// gte would also work but keeps imports minimal.
				)
			)
			.orderBy(asc(flaschenDateOverride.date))
	]);

	return {
		prefs,
		account: account[0] ?? null,
		knownLocations: locations,
		profile,
		dateOverrides: dateOverrides.filter((o) => o.date >= todayBerlin)
	};
};

const SHIFT_OPEN_MINUTES = 420; // 07:00
const SHIFT_CLOSE_MINUTES = 1380; // 23:00
const MIN_SHIFT_LENGTH = 60;
const MAX_SHIFT_LENGTH = 600;

function parseIntList(raw: FormDataEntryValue | null, allowed?: Set<number>): number[] {
	if (typeof raw !== 'string' || raw.trim() === '') return [];
	const out = new Set<number>();
	for (const s of raw.split(',')) {
		const n = Number(s.trim());
		if (Number.isInteger(n) && (!allowed || allowed.has(n))) out.add(n);
	}
	return Array.from(out).sort((a, b) => a - b);
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function parseShiftLength(raw: FormDataEntryValue | null, fallback: number): number {
	if (typeof raw !== 'string') return fallback;
	const n = Number(raw.trim());
	if (!Number.isFinite(n)) return fallback;
	return clamp(Math.round(n), MIN_SHIFT_LENGTH, MAX_SHIFT_LENGTH);
}

function sanitizeSlot(s: unknown): WeeklySlot | null {
	if (!s || typeof s !== 'object') return null;
	const obj = s as Record<string, unknown>;
	const start = Number(obj.start);
	const end = Number(obj.end);
	if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
	const cs = clamp(Math.round(start), SHIFT_OPEN_MINUTES, SHIFT_CLOSE_MINUTES);
	const ce = clamp(Math.round(end), SHIFT_OPEN_MINUTES, SHIFT_CLOSE_MINUTES);
	if (ce <= cs) return null;
	return { start: cs, end: ce };
}

function sanitizeSlots(arr: unknown): WeeklySlot[] {
	if (!Array.isArray(arr)) return [];
	const out: WeeklySlot[] = [];
	for (const s of arr) {
		const slot = sanitizeSlot(s);
		if (slot) out.push(slot);
	}
	out.sort((a, b) => a.start - b.start);
	// Reject overlapping slots — keep the first, drop later ones that overlap.
	const merged: WeeklySlot[] = [];
	for (const s of out) {
		const prev = merged[merged.length - 1];
		if (prev && s.start < prev.end) continue;
		merged.push(s);
	}
	return merged;
}

function sanitizeWeeklyWindows(raw: FormDataEntryValue | null): WeeklyWindows | null {
	if (typeof raw !== 'string') return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}
	if (!parsed || typeof parsed !== 'object') return null;
	const src = parsed as Record<string, unknown>;
	const out: WeeklyWindows = {
		'1': sanitizeSlots(src['1']),
		'2': sanitizeSlots(src['2']),
		'3': sanitizeSlots(src['3']),
		'4': sanitizeSlots(src['4']),
		'5': sanitizeSlots(src['5']),
		'6': sanitizeSlots(src['6']),
		'7': [] // Sunday always off — Flaschenpost closed
	};
	return out;
}

function isValidDate(s: string): boolean {
	return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export const actions: Actions = {
	savePrefs: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const fd = await request.formData();

		const weeklyWindows = sanitizeWeeklyWindows(fd.get('weeklyWindows'));
		if (!weeklyWindows) return fail(400, { error: 'INVALID_SCHEDULE' });

		const warehouseIds = parseIntList(fd.get('warehouseIds'));
		const workgroupIds = parseIntList(fd.get('workgroupIds'));
		if (warehouseIds.length === 0 || workgroupIds.length === 0) {
			return fail(400, { error: 'WAREHOUSE_AND_WORKGROUP_REQUIRED' });
		}

		const shiftMaxMinutes = parseShiftLength(fd.get('shiftMaxMinutes'), 360);
		const includeMarketplace = fd.get('includeMarketplace') === 'on';
		const enabled = fd.get('enabled') === 'on';

		try {
			await savePrefs(userId, {
				enabled,
				weeklyWindows,
				warehouseIds,
				workgroupIds,
				shiftMaxMinutes,
				includeMarketplace
			});
		} catch (e) {
			logger.error('savePrefs failed', { userId, error: String(e) });
			return fail(500, { error: 'DB_ERROR', correlationId: locals.correlationId });
		}

		return { success: true, savedAt: Date.now() };
	},

	saveOverride: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '').trim() || null;
		const date = String(fd.get('date') ?? '').trim();
		const kindRaw = String(fd.get('kind') ?? '').trim();
		const note = String(fd.get('note') ?? '').trim() || null;

		if (!isValidDate(date)) return fail(400, { error: 'INVALID_DATE' });
		if (kindRaw !== 'available' && kindRaw !== 'unavailable') {
			return fail(400, { error: 'INVALID_KIND' });
		}
		const kind = kindRaw;

		const slots = kind === 'available' ? sanitizeSlots(safeJson(fd.get('slots'))) : [];
		if (kind === 'available' && slots.length === 0) {
			return fail(400, { error: 'AVAILABLE_NEEDS_SLOTS' });
		}

		try {
			if (id) {
				await db
					.update(flaschenDateOverride)
					.set({ date, kind, slots, note })
					.where(and(eq(flaschenDateOverride.id, id), eq(flaschenDateOverride.userId, userId)));
			} else {
				await db
					.insert(flaschenDateOverride)
					.values({ userId, date, kind, slots, note })
					.onConflictDoUpdate({
						target: [flaschenDateOverride.userId, flaschenDateOverride.date],
						set: { kind, slots, note }
					});
			}
		} catch (e) {
			logger.error('saveOverride failed', { userId, error: String(e) });
			return fail(500, { error: 'DB_ERROR', correlationId: locals.correlationId });
		}

		return { success: true, savedAt: Date.now() };
	},

	deleteOverride: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const fd = await request.formData();
		const id = String(fd.get('id') ?? '').trim();
		if (!id) return fail(400, { error: 'INVALID_ID' });

		try {
			await db
				.delete(flaschenDateOverride)
				.where(and(eq(flaschenDateOverride.id, id), eq(flaschenDateOverride.userId, userId)));
		} catch (e) {
			logger.error('deleteOverride failed', { userId, error: String(e) });
			return fail(500, { error: 'DB_ERROR', correlationId: locals.correlationId });
		}

		return { success: true };
	},

	connect: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const fd = await request.formData();
		const username = String(fd.get('username') ?? '').trim();
		const password = String(fd.get('password') ?? '');
		if (!username || !password) return fail(400, { error: 'MISSING_CREDENTIALS' });

		try {
			const tokens = await passwordGrant(username, password);
			if (!tokens.employeeId) {
				return fail(500, {
					error: 'NO_EMPLOYEE_ID',
					correlationId: locals.correlationId
				});
			}
			await saveTokens(userId, tokens, { username, markConnected: true });
			logger.info('flaschen connected', { userId, employeeId: tokens.employeeId });
			return { success: true };
		} catch (e) {
			if (e instanceof OAuthError && e.isInvalidCredentials) {
				return fail(401, { error: 'INVALID_CREDENTIALS' });
			}
			const status = e instanceof OAuthError ? e.status : null;
			const body = e instanceof OAuthError ? e.body.slice(0, 500) : null;
			logger.error('flaschen connect failed', {
				userId,
				error: String(e),
				oauthStatus: status,
				oauthBody: body
			});
			// 400/401 from the token endpoint without a recognised error code is
			// almost always a credentials problem — treat as such.
			if (status === 400 || status === 401) {
				return fail(401, { error: 'INVALID_CREDENTIALS' });
			}
			return fail(500, {
				error: 'CONNECT_FAILED',
				correlationId: locals.correlationId
			});
		}
	},

	disconnect: async ({ locals }) => {
		const userId = locals.user!.id;
		await disconnectAccount(userId);
		return { success: true };
	}
};

function safeJson(raw: FormDataEntryValue | null): unknown {
	if (typeof raw !== 'string') return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}
