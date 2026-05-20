import type { PageServerLoad } from './$types';
import { Temporal } from '@js-temporal/polyfill';
import { and, asc, eq, gte, lt, sql } from 'drizzle-orm';
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
