import type { ShiftOfferPayload } from '@nexo/db';
import { browserHeaders } from './headers';
import { ensureFreshAccessToken, loadAccount } from './tokens';

const API_BASE = 'https://api.flaschen.io/employee-portal-api/v1';
const REQUEST_TIMEOUT_MS = 20_000;

/** A shift the employee has already been scheduled for (their own roster), as
 *  returned by /shift-planning/{employeeId}/planned-for-employee. */
export type PlannedShiftPayload = {
	shiftId: string;
	warehouse: { warehouseId: number; name: string };
	workgroup: { workgroupId: number; name: string };
	date: string;
	start: string;
	durationInMinutes: number;
	rewardScore: number;
	shiftType: string | null;
	employeeStartedShift: boolean;
	isMarketplaceShift: boolean;
};

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly body: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
	const ctrl = new AbortController();
	const t = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
	try {
		return await fetch(url, { ...init, signal: ctrl.signal });
	} catch (err) {
		if (err instanceof Error && err.name === 'AbortError') {
			throw new ApiError(`request timed out after ${REQUEST_TIMEOUT_MS}ms`, 0, '');
		}
		throw err;
	} finally {
		clearTimeout(t);
	}
}

type RawShiftOffer = {
	warehouse?: { warehouseId?: number; name?: string };
	workgroup?: { workgroupId?: number; name?: string };
	date?: string;
	start?: string;
	end?: string;
	durationInMinutes?: number;
	rewardScore?: number;
	isMarketplaceShift?: boolean;
};

function normalizeOffer(raw: RawShiftOffer): ShiftOfferPayload | null {
	if (!raw.warehouse?.warehouseId || !raw.workgroup?.workgroupId || !raw.start) return null;
	return {
		warehouse: {
			warehouseId: raw.warehouse.warehouseId,
			name: raw.warehouse.name ?? `#${raw.warehouse.warehouseId}`
		},
		workgroup: {
			workgroupId: raw.workgroup.workgroupId,
			name: raw.workgroup.name ?? `#${raw.workgroup.workgroupId}`
		},
		date: raw.date ?? raw.start.slice(0, 10),
		start: raw.start,
		end: raw.end,
		durationInMinutes: raw.durationInMinutes ?? 0,
		rewardScore: raw.rewardScore ?? 0,
		isMarketplaceShift: Boolean(raw.isMarketplaceShift)
	};
}

export async function listShiftOffers(
	userId: string,
	from: string,
	to: string
): Promise<ShiftOfferPayload[]> {
	const acct = await loadAccount(userId);
	if (!acct) throw new Error(`no flaschen account for user ${userId}`);

	const token = await ensureFreshAccessToken(userId);
	const url =
		`${API_BASE}/shift-offer/${encodeURIComponent(acct.employeeId)}` +
		`/target-shift-slots-assignable-to-employee` +
		`?From=${encodeURIComponent(from)}&To=${encodeURIComponent(to)}`;

	const res = await fetchWithTimeout(url, {
		headers: browserHeaders({ Authorization: `Bearer ${token}` })
	});

	const text = await res.text();
	if (!res.ok) throw new ApiError(`shift-offer endpoint ${res.status}`, res.status, text);

	if (res.status === 204 || text.trim() === '') return [];

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new ApiError('shift-offer endpoint returned non-JSON', res.status, text);
	}

	const list: RawShiftOffer[] = Array.isArray(parsed)
		? (parsed as RawShiftOffer[])
		: Array.isArray((parsed as { items?: unknown }).items)
			? (parsed as { items: RawShiftOffer[] }).items
			: [];

	const offers: ShiftOfferPayload[] = [];
	for (const raw of list) {
		const normalized = normalizeOffer(raw);
		if (normalized) offers.push(normalized);
	}
	return offers;
}

type RawPlannedShift = {
	shiftId?: string;
	warehouse?: { warehouseId?: number; name?: string };
	workgroup?: { workgroupId?: number; name?: string };
	date?: string;
	startTime?: string;
	grossDurationInMinutes?: number;
	rewardScore?: number;
	shiftType?: string | null;
	employeeStartedShift?: boolean;
	isMarketplaceShift?: boolean;
};

function normalizePlanned(raw: RawPlannedShift): PlannedShiftPayload | null {
	if (!raw.shiftId || !raw.warehouse?.warehouseId || !raw.workgroup?.workgroupId || !raw.startTime)
		return null;
	return {
		shiftId: raw.shiftId,
		warehouse: {
			warehouseId: raw.warehouse.warehouseId,
			name: raw.warehouse.name ?? `#${raw.warehouse.warehouseId}`
		},
		workgroup: {
			workgroupId: raw.workgroup.workgroupId,
			name: raw.workgroup.name ?? `#${raw.workgroup.workgroupId}`
		},
		date: raw.date ?? raw.startTime.slice(0, 10),
		start: raw.startTime,
		durationInMinutes: raw.grossDurationInMinutes ?? 0,
		rewardScore: raw.rewardScore ?? 0,
		shiftType: raw.shiftType ?? null,
		employeeStartedShift: Boolean(raw.employeeStartedShift),
		isMarketplaceShift: Boolean(raw.isMarketplaceShift)
	};
}

export async function listPlannedShifts(
	userId: string,
	maxCount = 10
): Promise<PlannedShiftPayload[]> {
	const acct = await loadAccount(userId);
	if (!acct) throw new Error(`no flaschen account for user ${userId}`);

	const token = await ensureFreshAccessToken(userId);
	const url =
		`${API_BASE}/shift-planning/${encodeURIComponent(acct.employeeId)}` +
		`/planned-for-employee?maxCount=${encodeURIComponent(String(maxCount))}`;

	const res = await fetchWithTimeout(url, {
		headers: browserHeaders({ Authorization: `Bearer ${token}` })
	});

	const text = await res.text();
	if (!res.ok) throw new ApiError(`planned-for-employee endpoint ${res.status}`, res.status, text);

	if (res.status === 204 || text.trim() === '') return [];

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new ApiError('planned-for-employee endpoint returned non-JSON', res.status, text);
	}

	const list: RawPlannedShift[] = Array.isArray(parsed)
		? (parsed as RawPlannedShift[])
		: Array.isArray((parsed as { items?: unknown }).items)
			? (parsed as { items: RawPlannedShift[] }).items
			: [];

	const out: PlannedShiftPayload[] = [];
	for (const raw of list) {
		const n = normalizePlanned(raw);
		if (n) out.push(n);
	}
	out.sort((a, b) => a.start.localeCompare(b.start));
	return out;
}

/** Accept (assign) a target shift slot to the employee. Mirrors the
 *  portal.flaschenpost.de "Take shift" button. The upstream returns 200 with
 *  an empty body on success. The endpoint is idempotent in practice: a second
 *  call for the same slot returns 4xx (already assigned / no longer offered).
 */
export async function acceptShiftOffer(userId: string, offer: ShiftOfferPayload): Promise<void> {
	const acct = await loadAccount(userId);
	if (!acct) throw new Error(`no flaschen account for user ${userId}`);

	const token = await ensureFreshAccessToken(userId);
	const url =
		`${API_BASE}/shift-offer/${encodeURIComponent(acct.employeeId)}` +
		`/assign-shift-from-target-shift-slot-to-employee`;

	const planDate = `${offer.date}T00:00:00+00:00`;
	const body = {
		employeeId: acct.employeeId,
		shiftPeriod: {
			durationInMinutes: offer.durationInMinutes,
			start: offer.start
		},
		shiftPlanId: {
			date: planDate,
			warehouseId: offer.warehouse.warehouseId,
			workgroupId: offer.workgroup.workgroupId
		},
		expectedRewardScore: offer.rewardScore,
		ignoreExpectedRewardScoreValidation: true,
		isMarketplaceShift: offer.isMarketplaceShift
	};

	const res = await fetchWithTimeout(url, {
		method: 'POST',
		headers: browserHeaders({
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		}),
		body: JSON.stringify(body)
	});

	const text = await res.text();
	if (!res.ok) throw new ApiError(`assign-shift endpoint ${res.status}`, res.status, text);
}
