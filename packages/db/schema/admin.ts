import { pgSchema, uuid, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';

export const adminSchema = pgSchema('admin');

export const healthCheckRun = adminSchema.table(
	'health_check_run',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		target: text('target').notNull(),
		checkedAt: timestamp('checked_at', { withTimezone: true }).notNull().defaultNow(),
		ok: boolean('ok').notNull(),
		latencyMs: integer('latency_ms'),
		error: text('error'),
		source: text('source').notNull()
	},
	(t) => [index('hcr_target_time_idx').on(t.target, t.checkedAt)]
);

export type HealthCheckRunRow = typeof healthCheckRun.$inferSelect;
