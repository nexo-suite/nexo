import {
	initDb,
	closeDb,
	db,
	flaschenAccount,
	flaschenDateOverride,
	flaschenPollLog
} from '@nexo/db';
import { and, eq, gte } from 'drizzle-orm';
import { createLogger } from '@nexo/logger';
import { sendToUser, initPush } from '@nexo/push/server';
import {
	listShiftOffers,
	loadPrefs,
	reconcileOffers,
	rangeForDays,
	formatOfferBody,
	dedupeKey,
	ReconnectRequiredError,
	OAuthError
} from '../lib/server/flaschenpost';
import { Temporal } from '@js-temporal/polyfill';

const logger = createLogger('flaschen-worker');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	logger.error('DATABASE_URL is not set');
	process.exit(1);
}
initDb(DATABASE_URL);

const VAPID_SUBJECT = process.env.VAPID_SUBJECT;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
if (!VAPID_SUBJECT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
	logger.error('VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY must be set');
	process.exit(1);
}
initPush({
	subject: VAPID_SUBJECT,
	publicKey: VAPID_PUBLIC_KEY,
	privateKey: VAPID_PRIVATE_KEY
});

const POLL_INTERVAL_MS = Number(process.env.FLASCHEN_POLL_INTERVAL_MS ?? 180_000);
const POLL_JITTER_MS = Number(process.env.FLASCHEN_POLL_JITTER_MS ?? 30_000);
const QUIET_HOURS = parseQuietHours(process.env.FLASCHEN_QUIET_HOURS ?? '22-06');
const TZ = 'Europe/Berlin';

function parseQuietHours(spec: string): { start: number; end: number } | null {
	const m = /^(\d{1,2})-(\d{1,2})$/.exec(spec.trim());
	if (!m) return null;
	const start = Number(m[1]);
	const end = Number(m[2]);
	if (start === end) return null;
	return { start, end };
}

function inQuietHours(now: Date = new Date()): boolean {
	if (!QUIET_HOURS) return false;
	const h = Temporal.Instant.fromEpochMilliseconds(now.getTime()).toZonedDateTimeISO(TZ).hour;
	const { start, end } = QUIET_HOURS;
	return start < end ? h >= start && h < end : h >= start || h < end;
}

function userInQuietHours(
	prefs: { quietHoursEnabled: boolean; quietStartMinutes: number; quietEndMinutes: number },
	now: Date = new Date()
): boolean {
	if (!prefs.quietHoursEnabled) return false;
	const zoned = Temporal.Instant.fromEpochMilliseconds(now.getTime()).toZonedDateTimeISO(TZ);
	const minutes = zoned.hour * 60 + zoned.minute;
	const { quietStartMinutes: start, quietEndMinutes: end } = prefs;
	if (start === end) return false;
	return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

function jitter(): number {
	return Math.floor((Math.random() - 0.5) * 2 * POLL_JITTER_MS);
}

let stopping = false;
let inflightTick: Promise<void> | null = null;
async function tick(): Promise<void> {
	if (stopping) return;
	if (inQuietHours()) {
		logger.info('skipped poll (quiet hours)', {});
		return;
	}

	const accounts = await db
		.select()
		.from(flaschenAccount)
		.where(eq(flaschenAccount.needsReconnect, false));

	logger.info('tick', { accounts: accounts.length });

	for (const acct of accounts) {
		if (stopping) return;
		await pollOne(acct.userId).catch((e) => {
			logger.error('poll uncaught', { userId: acct.userId, error: String(e) });
		});
	}
}

async function pollOne(userId: string): Promise<void> {
	try {
		const prefs = await loadPrefs(userId);
		if (!prefs.enabled) {
			await db
				.update(flaschenAccount)
				.set({ lastPollAt: new Date(), lastPollOk: true, lastPollError: null })
				.where(eq(flaschenAccount.userId, userId));
			return;
		}

		const todayBerlin = Temporal.Now.zonedDateTimeISO(TZ).toPlainDate().toString();
		const overrides = await db
			.select()
			.from(flaschenDateOverride)
			.where(
				and(eq(flaschenDateOverride.userId, userId), gte(flaschenDateOverride.date, todayBerlin))
			);

		const { from, to } = rangeForDays(30);
		const offers = await listShiftOffers(userId, from, to);
		const result = await reconcileOffers(userId, prefs, overrides, offers);

		await db
			.update(flaschenAccount)
			.set({ lastPollAt: new Date(), lastPollOk: true, lastPollError: null })
			.where(eq(flaschenAccount.userId, userId));

		await db.insert(flaschenPollLog).values({
			userId,
			ok: true,
			offersSeen: result.totalOffers,
			matches: result.newMatches
		});

		for (const offer of result.matchedOffers) {
			if (userInQuietHours(prefs)) {
				logger.info('suppressed push (user quiet hours)', { userId, dedupeKey: dedupeKey(offer) });
				continue;
			}
			await sendToUser(userId, 'flaschen', {
				title: `Neue Schicht: ${offer.warehouse.name}`,
				body: formatOfferBody(offer),
				tag: dedupeKey(offer),
				url: `/?shift=${encodeURIComponent(dedupeKey(offer))}`
			}).catch((e) => {
				logger.error('push send failed', { userId, error: String(e) });
			});
		}

		if (result.newMatches > 0) {
			logger.info('matches', { userId, matches: result.newMatches });
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		logger.error('poll failed', { userId, error: msg });

		const isReconnect =
			e instanceof ReconnectRequiredError || (e instanceof OAuthError && e.isInvalidGrant);

		await db
			.update(flaschenAccount)
			.set({
				lastPollAt: new Date(),
				lastPollOk: false,
				lastPollError: msg,
				...(isReconnect ? { needsReconnect: true } : {})
			})
			.where(eq(flaschenAccount.userId, userId));

		await db.insert(flaschenPollLog).values({ userId, ok: false, error: msg });
	}
}

let timer: NodeJS.Timeout | null = null;
function schedule(): void {
	if (stopping) return;
	const delay = POLL_INTERVAL_MS + jitter();
	timer = setTimeout(async () => {
		inflightTick = tick();
		try {
			await inflightTick;
		} finally {
			inflightTick = null;
		}
		schedule();
	}, delay);
	timer.unref();
}

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
	if (shuttingDown) return;
	shuttingDown = true;
	logger.info('shutdown', { signal });
	stopping = true;
	if (timer) {
		clearTimeout(timer);
		timer = null;
	}
	if (inflightTick) {
		try {
			await Promise.race([
				inflightTick,
				new Promise((resolve) => setTimeout(resolve, 8000).unref())
			]);
		} catch (e) {
			logger.error('tick failed during shutdown', { error: String(e) });
		}
	}
	try {
		await closeDb();
	} catch (e) {
		logger.error('closeDb failed', { error: String(e) });
	}
	process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

logger.info('starting', {
	pollIntervalMs: POLL_INTERVAL_MS,
	jitterMs: POLL_JITTER_MS,
	quietHours: QUIET_HOURS
});

void (async () => {
	inflightTick = tick();
	try {
		await inflightTick;
	} finally {
		inflightTick = null;
	}
	schedule();
})();
