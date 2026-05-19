import { pgSchema, uuid, text, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const pushSchema = pgSchema('push');

export const pushSubscription = pushSchema.table(
	'subscription',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		app: text('app').notNull(),
		endpoint: text('endpoint').notNull(),
		p256dh: text('p256dh').notNull(),
		auth: text('auth').notNull(),
		userAgent: text('user_agent'),
		label: text('label'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		lastUsedAt: timestamp('last_used_at', { withTimezone: true })
	},
	(t) => [
		unique('push_subscription_user_app_endpoint_uniq').on(t.userId, t.app, t.endpoint),
		index('push_subscription_user_app_idx').on(t.userId, t.app)
	]
);

export type PushSubscriptionRow = typeof pushSubscription.$inferSelect;
