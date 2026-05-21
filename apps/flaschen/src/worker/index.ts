import {
	initDb,
	closeDb,
	db,
	flaschenAccount,
	flaschenDateOverride,
	flaschenPollLog
} from '@nexo/db';
import { and, eq, gte, isNull, lt, or } from 'drizzle-orm';
import { createLogger } from '@nexo/logger';
import { sendToUser, initPush } from '@nexo/push/server';
import {
	listShiftOffers,
	loadPrefs,
	reconcileOffers,
	rangeForDays,
	formatOfferBody,
	dedupeKey,
	keepaliveRefresh,
	ReconnectRequiredError,
	OAuthError
} from '../lib/server/flaschenpost';
import { Temporal } from '@js-temporal/polyfill';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const logger = createLogger('flaschen-worker');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	logger.error('DATABASE_URL is not set');
	process.exit(1);
}
initDb(DATABASE_URL, { max: 5 });

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
const KEEPALIVE_INTERVAL_MS = Number(
	process.env.FLASCHEN_KEEPALIVE_INTERVAL_MS ?? 20 * 60 * 60_000
);
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

// ── Health state ───────────────────────────────────────────────────────────
let lastTickAt: number | null = null;
let lastTickOk = false;
let lastTickLatencyMs = 0;
let lastTickError: string | null = null;
let lastKeepaliveAt: number | null = null;
let accountsSeen = 0;
const startedAt = Date.now();

const WORKER_VERSION =
	process.env.APP_VERSION ??
	(() => {
		try {
			const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
			return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
		} catch {
			return '0.0.0';
		}
	})();
const WORKER_COMMIT =
	process.env.APP_COMMIT ?? process.env.GIT_COMMIT ?? process.env.GITHUB_SHA?.slice(0, 7) ?? 'dev';
const WORKER_BUILD_TIME =
	process.env.APP_BUILD_TIME ?? process.env.BUILD_TIME ?? new Date().toISOString();
const HEALTH_PORT = Number(process.env.WORKER_HEALTH_PORT ?? 3004);

async function tick(): Promise<void> {
	if (stopping) return;
	const t0 = Date.now();

	await keepalivePass().catch((e) => {
		logger.error('keepalive pass uncaught', { error: String(e) });
	});

	if (inQuietHours()) {
		logger.info('skipped poll (quiet hours)', {});
		lastTickAt = Date.now();
		lastTickOk = true;
		lastTickLatencyMs = Date.now() - t0;
		lastTickError = null;
		return;
	}

	try {
		const accounts = await db
			.select()
			.from(flaschenAccount)
			.where(eq(flaschenAccount.needsReconnect, false));

		accountsSeen = accounts.length;
		logger.info('tick', { accounts: accounts.length });

		for (const acct of accounts) {
			if (stopping) return;
			await pollOne(acct.userId).catch((e) => {
				logger.error('poll uncaught', { userId: acct.userId, error: String(e) });
			});
		}
		lastTickOk = true;
		lastTickError = null;
	} catch (e) {
		lastTickOk = false;
		lastTickError = e instanceof Error ? e.message : String(e);
		logger.error('tick failed', { error: lastTickError });
	} finally {
		lastTickAt = Date.now();
		lastTickLatencyMs = Date.now() - t0;
	}
}

/** Refresh tokens for all linked (non-disconnected) users that haven't
 * refreshed recently, regardless of poll-paused state or quiet hours. The
 * goal is to keep the refresh_token alive during long inactive stretches and
 * surface server-side revocations as `needsReconnect` sooner than the next
 * actual poll would. */
async function keepalivePass(): Promise<void> {
	const cutoff = new Date(Date.now() - KEEPALIVE_INTERVAL_MS);
	const due = await db
		.select({ userId: flaschenAccount.userId })
		.from(flaschenAccount)
		.where(
			and(
				eq(flaschenAccount.needsReconnect, false),
				or(isNull(flaschenAccount.lastRefreshAt), lt(flaschenAccount.lastRefreshAt, cutoff))
			)
		);

	if (due.length === 0) return;
	logger.info('keepalive', { due: due.length });

	for (const { userId } of due) {
		if (stopping) return;
		try {
			const result = await keepaliveRefresh(userId);
			if (result.needsReconnect) {
				logger.warn('keepalive marked needsReconnect', { userId });
			}
		} catch (e) {
			logger.error('keepalive failed', { userId, error: String(e) });
		}
	}
	lastKeepaliveAt = Date.now();
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
	healthServer.close();
	try {
		await closeDb();
	} catch (e) {
		logger.error('closeDb failed', { error: String(e) });
	}
	process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// ── Health server ──────────────────────────────────────────────────────────
// Considers the worker healthy when the most recent tick completed within
// 3× the poll interval — catches a wedged loop without flapping on a single
// slow tick.
const healthServer = createServer((req, res) => {
	if (req.url !== '/healthz' && req.url !== '/health') {
		res.writeHead(404).end();
		return;
	}
	const now = Date.now();
	const tickStaleMs = lastTickAt === null ? Infinity : now - lastTickAt;
	const tickMaxAgeMs = POLL_INTERVAL_MS * 3 + POLL_JITTER_MS;
	const tickFresh = tickStaleMs <= tickMaxAgeMs;
	const ok = lastTickAt !== null && lastTickOk && tickFresh;

	const body = {
		ok,
		version: WORKER_VERSION,
		commit: WORKER_COMMIT,
		buildTime: WORKER_BUILD_TIME,
		uptime_ms: now - startedAt,
		lastTickAt: lastTickAt ? new Date(lastTickAt).toISOString() : null,
		lastTickOk,
		lastTickError,
		lastKeepaliveAt: lastKeepaliveAt ? new Date(lastKeepaliveAt).toISOString() : null,
		accountsSeen,
		checks: {
			tick: {
				ok: tickFresh && lastTickOk,
				latency_ms: lastTickLatencyMs,
				...(tickFresh
					? {}
					: { error: `last tick was ${tickStaleMs}ms ago (max ${tickMaxAgeMs}ms)` }),
				...(lastTickError ? { error: lastTickError } : {})
			}
		},
		latency_ms: 0
	};
	res.writeHead(ok ? 200 : 503, { 'content-type': 'application/json' }).end(JSON.stringify(body));
});
healthServer.listen(HEALTH_PORT, () => {
	logger.info('health server listening', { port: HEALTH_PORT });
});

logger.info('starting', {
	pollIntervalMs: POLL_INTERVAL_MS,
	jitterMs: POLL_JITTER_MS,
	keepaliveIntervalMs: KEEPALIVE_INTERVAL_MS,
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
