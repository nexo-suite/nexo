import {
	pgSchema,
	uuid,
	text,
	integer,
	boolean,
	timestamp,
	jsonb,
	smallint,
	unique,
	index,
	date
} from 'drizzle-orm/pg-core';
import { users } from './auth';

export const flaschenSchema = pgSchema('flaschen');

/** Snapshot of a shift offer as returned by api.flaschen.io. We store enough
 * to render the dashboard and notification body without re-fetching, plus the
 * raw IDs for matching. */
export type ShiftOfferPayload = {
	warehouse: { warehouseId: number; name: string };
	workgroup: { workgroupId: number; name: string };
	date: string;
	start: string;
	end?: string;
	durationInMinutes: number;
	rewardScore: number;
	isMarketplaceShift: boolean;
};

/** Half-open minutes-of-day pair `[start, end)` in Europe/Berlin local time. */
export type WeeklySlot = { start: number; end: number };

/** Per-weekday availability. Keys are ISO weekday as string ("1"=Mon..."7"=Sun).
 * Empty array on a day means "off". Multiple slots allow gaps (mornings + evenings,
 * skipping midday). */
export type WeeklyWindows = Record<'1' | '2' | '3' | '4' | '5' | '6' | '7', WeeklySlot[]>;

const DEFAULT_WEEKLY_WINDOWS: WeeklyWindows = {
	'1': [{ start: 420, end: 1380 }],
	'2': [{ start: 420, end: 1380 }],
	'3': [{ start: 420, end: 1380 }],
	'4': [{ start: 420, end: 1380 }],
	'5': [{ start: 420, end: 1380 }],
	'6': [{ start: 420, end: 1380 }],
	'7': []
};

export const flaschenAccount = flaschenSchema.table('account', {
	userId: text('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	employeeId: text('employee_id').notNull(),
	username: text('username'),
	encryptedRefreshToken: text('encrypted_refresh_token').notNull(),
	encryptedAccessToken: text('encrypted_access_token').notNull(),
	accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }).notNull(),
	lastLoginAt: timestamp('last_login_at', { withTimezone: true }).notNull().defaultNow(),
	lastPollAt: timestamp('last_poll_at', { withTimezone: true }),
	lastPollOk: boolean('last_poll_ok'),
	lastPollError: text('last_poll_error'),
	needsReconnect: boolean('needs_reconnect').notNull().default(false),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const flaschenPrefs = flaschenSchema.table('prefs', {
	userId: text('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	enabled: boolean('enabled').notNull().default(true),
	// Per-weekday slots. Empty array on a day = off. Sunday defaults to [] (Flaschenpost closed).
	weeklyWindows: jsonb('weekly_windows')
		.$type<WeeklyWindows>()
		.notNull()
		.default(DEFAULT_WEEKLY_WINDOWS),
	warehouseIds: jsonb('warehouse_ids').$type<number[]>().notNull().default([3]),
	workgroupIds: jsonb('workgroup_ids').$type<number[]>().notNull().default([1]),
	shiftMaxMinutes: smallint('shift_max_minutes').notNull().default(360),
	includeMarketplace: boolean('include_marketplace').notNull().default(true),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

/** One-off date overrides. `available` replaces the weekly slots for that date;
 * `unavailable` blocks the date entirely regardless of weekly schedule. */
export const flaschenDateOverride = flaschenSchema.table(
	'date_override',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		date: date('date').notNull(),
		kind: text('kind').$type<'available' | 'unavailable'>().notNull(),
		slots: jsonb('slots').$type<WeeklySlot[]>().notNull().default([]),
		note: text('note'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		unique('flaschen_date_override_user_date_uniq').on(t.userId, t.date),
		index('flaschen_date_override_user_date_idx').on(t.userId, t.date)
	]
);

export const flaschenSeenOffer = flaschenSchema.table(
	'seen_offer',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		dedupeKey: text('dedupe_key').notNull(),
		firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
		matched: boolean('matched').notNull().default(false),
		borderline: boolean('borderline').notNull().default(false),
		notified: boolean('notified').notNull().default(false),
		offer: jsonb('offer').$type<ShiftOfferPayload>().notNull()
	},
	(t) => [
		unique('flaschen_seen_offer_user_dedupe_uniq').on(t.userId, t.dedupeKey),
		index('flaschen_seen_offer_user_first_seen_idx').on(t.userId, t.firstSeenAt)
	]
);

export const flaschenPollLog = flaschenSchema.table(
	'poll_log',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		ranAt: timestamp('ran_at', { withTimezone: true }).notNull().defaultNow(),
		ok: boolean('ok').notNull(),
		offersSeen: integer('offers_seen').notNull().default(0),
		matches: integer('matches').notNull().default(0),
		error: text('error')
	},
	(t) => [index('flaschen_poll_log_user_ran_idx').on(t.userId, t.ranAt)]
);

/** Snapshot of every warehouse / workgroup the API has surfaced for this user.
 * Used to populate the chip pickers in /settings without hard-coding values. */
export const flaschenSeenLocation = flaschenSchema.table(
	'seen_location',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		warehouseId: integer('warehouse_id').notNull(),
		warehouseName: text('warehouse_name').notNull(),
		workgroupId: integer('workgroup_id').notNull(),
		workgroupName: text('workgroup_name').notNull(),
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [unique('flaschen_seen_location_uniq').on(t.userId, t.warehouseId, t.workgroupId)]
);

export type FlaschenAccount = typeof flaschenAccount.$inferSelect;
export type FlaschenPrefs = typeof flaschenPrefs.$inferSelect;
export type FlaschenSeenOffer = typeof flaschenSeenOffer.$inferSelect;
export type FlaschenPollLog = typeof flaschenPollLog.$inferSelect;
export type FlaschenSeenLocation = typeof flaschenSeenLocation.$inferSelect;
export type FlaschenDateOverride = typeof flaschenDateOverride.$inferSelect;
