import type { Actions, PageServerLoad } from './$types';
import { Temporal } from '@js-temporal/polyfill';
import { and, asc, eq, gte, lt, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import {
	db,
	flaschenAccount,
	flaschenDateOverride,
	flaschenSeenOffer,
	pushSubscription
} from '@nexo/db';
import { logger } from '$lib/server/logger';
import { getLocale } from '$lib/paraglide/runtime.js';
import {
	loadPrefs,
	listShiftOffers,
	listPlannedShifts,
	reconcileOffers,
	rangeForDays,
	ReconnectRequiredError,
	ApiError,
	acceptShiftOffer,
	windowFailDetail,
	withinLengthRange,
	meetsAdvanceNotice,
	type PlannedShiftPayload
} from '$lib/server/flaschenpost';

const TZ = 'Europe/Berlin';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;
	const focusKey = url.searchParams.get('shift');

	const todayBerlin = Temporal.Now.zonedDateTimeISO(TZ).toPlainDate().toString();

	await db
		.delete(flaschenDateOverride)
		.where(
			and(eq(flaschenDateOverride.userId, userId), lt(flaschenDateOverride.date, todayBerlin))
		);

	const [prefs, accountRow, overrides, deviceCountRow] = await Promise.all([
		loadPrefs(userId),
		db.select().from(flaschenAccount).where(eq(flaschenAccount.userId, userId)).limit(1),
		db
			.select()
			.from(flaschenDateOverride)
			.where(
				and(eq(flaschenDateOverride.userId, userId), gte(flaschenDateOverride.date, todayBerlin))
			),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(pushSubscription)
			.where(and(eq(pushSubscription.userId, userId), eq(pushSubscription.app, 'flaschen')))
	]);
	const account = accountRow[0] ?? null;
	const deviceCount = deviceCountRow[0]?.count ?? 0;

	let warning: 'fetch_failed' | 'reconnect_required' | null = null;
	let plannedShifts: PlannedShiftPayload[] = [];

	if (account && !account.needsReconnect) {
		const { from, to } = rangeForDays(7);
		const [offersRes, plannedRes] = await Promise.allSettled([
			listShiftOffers(userId, from, to).then((offers) =>
				reconcileOffers(userId, prefs, overrides, offers)
			),
			listPlannedShifts(userId, 10)
		]);

		for (const r of [offersRes, plannedRes]) {
			if (r.status === 'rejected') {
				if (r.reason instanceof ReconnectRequiredError) warning = 'reconnect_required';
				else if (warning !== 'reconnect_required') warning = 'fetch_failed';
				const apiInfo =
					r.reason instanceof ApiError
						? { upstreamStatus: r.reason.status, upstreamBody: r.reason.body.slice(0, 500) }
						: {};
				logger.warn('dashboard live fetch failed', {
					userId,
					correlationId: locals.correlationId,
					error: r.reason instanceof Error ? r.reason.message : String(r.reason),
					...apiInfo
				});
			}
		}
		if (plannedRes.status === 'fulfilled') plannedShifts = plannedRes.value;
	}

	const rows = await db
		.select()
		.from(flaschenSeenOffer)
		.where(and(eq(flaschenSeenOffer.userId, userId), eq(flaschenSeenOffer.stillAvailable, true)))
		.orderBy(asc(sql`(${flaschenSeenOffer.offer} ->> 'start')`));

	const matches = rows
		.filter((r) => r.matched)
		.map((r) => ({ ...r.offer, dedupeKey: r.dedupeKey }));
	const borderlines = rows
		.filter((r) => r.borderline && !r.matched)
		.map((r) => {
			let reason: 'length' | 'advance' | null = null;
			if (!withinLengthRange(prefs, r.offer)) reason = 'length';
			else if (!meetsAdvanceNotice(prefs, r.offer)) reason = 'advance';
			return { ...r.offer, dedupeKey: r.dedupeKey, reason };
		});
	const unmatched = rows
		.filter((r) => !r.matched && !r.borderline)
		.map((r) => {
			const detail = windowFailDetail(prefs, overrides, r.offer);
			return {
				...r.offer,
				dedupeKey: r.dedupeKey,
				reason: detail?.reason ?? null,
				overrideDate: detail?.overrideDate ?? null
			};
		});

	let takenShift: { offer: (typeof rows)[number]['offer']; dedupeKey: string } | null = null;
	if (focusKey && !rows.some((r) => r.dedupeKey === focusKey)) {
		const stale = await db
			.select()
			.from(flaschenSeenOffer)
			.where(and(eq(flaschenSeenOffer.userId, userId), eq(flaschenSeenOffer.dedupeKey, focusKey)))
			.limit(1);
		if (stale[0]) takenShift = { offer: stale[0].offer, dedupeKey: stale[0].dedupeKey };
	}

	return {
		matches,
		borderlines,
		unmatched,
		plannedShifts,
		takenShift,
		focusKey,
		warning,
		lastPolledAt: account?.lastPollAt ?? null,
		pollEnabled: prefs.enabled,
		deviceCount,
		todayLabel: formatTodayLabel()
	};
};

function formatTodayLabel(): string {
	try {
		return new Date().toLocaleDateString(getLocale(), {
			weekday: 'long',
			month: 'short',
			day: 'numeric'
		});
	} catch {
		return '';
	}
}

export const actions: Actions = {
	takeShift: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const fd = await request.formData();
		const dedupeKey = String(fd.get('dedupeKey') ?? '').trim();
		if (!dedupeKey) return fail(400, { takeError: 'INVALID_KEY' });

		// Atomic claim: flip stillAvailable=false in the same statement that
		// reads the offer payload. A second concurrent click hits zero rows and
		// short-circuits to OFFER_GONE without touching the upstream API.
		const claimed = await db
			.update(flaschenSeenOffer)
			.set({ stillAvailable: false })
			.where(
				and(
					eq(flaschenSeenOffer.userId, userId),
					eq(flaschenSeenOffer.dedupeKey, dedupeKey),
					eq(flaschenSeenOffer.stillAvailable, true)
				)
			)
			.returning({ offer: flaschenSeenOffer.offer });

		if (claimed.length === 0) {
			const exists = await db
				.select({ id: flaschenSeenOffer.id })
				.from(flaschenSeenOffer)
				.where(
					and(eq(flaschenSeenOffer.userId, userId), eq(flaschenSeenOffer.dedupeKey, dedupeKey))
				)
				.limit(1);
			return exists.length === 0
				? fail(404, { takeError: 'OFFER_NOT_FOUND' })
				: fail(409, { takeError: 'OFFER_GONE' });
		}

		const offer = claimed[0].offer;

		const releaseClaim = async () => {
			await db
				.update(flaschenSeenOffer)
				.set({ stillAvailable: true })
				.where(
					and(eq(flaschenSeenOffer.userId, userId), eq(flaschenSeenOffer.dedupeKey, dedupeKey))
				);
		};

		try {
			await acceptShiftOffer(userId, offer);
		} catch (e) {
			if (e instanceof ReconnectRequiredError) {
				// Token issue, not the offer — let the user retry after reconnecting.
				await releaseClaim();
				return fail(401, { takeError: 'RECONNECT_REQUIRED' });
			}
			if (e instanceof ApiError) {
				logger.warn('takeShift upstream rejected', {
					userId,
					correlationId: locals.correlationId,
					dedupeKey,
					upstreamStatus: e.status,
					upstreamBody: e.body.slice(0, 500)
				});
				// 4xx from upstream usually means the slot was just taken by
				// somebody else; keep it claimed locally so it disappears from
				// the dashboard.
				if (e.status >= 400 && e.status < 500) {
					return fail(409, { takeError: 'OFFER_GONE' });
				}
				// 5xx — Flaschenpost transient; release so the user can retry.
				await releaseClaim();
				return fail(502, {
					takeError: 'UPSTREAM_ERROR',
					correlationId: locals.correlationId
				});
			}
			logger.error('takeShift failed', {
				userId,
				correlationId: locals.correlationId,
				dedupeKey,
				error: String(e)
			});
			await releaseClaim();
			return fail(500, { takeError: 'UNKNOWN', correlationId: locals.correlationId });
		}

		return { takeSuccess: true, takenDedupeKey: dedupeKey };
	}
};
