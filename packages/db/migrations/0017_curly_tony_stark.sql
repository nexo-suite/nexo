ALTER TABLE "flaschen"."account" ADD COLUMN "refresh_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "flaschen"."prefs" ADD COLUMN "quiet_hours_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "flaschen"."prefs" ADD COLUMN "quiet_start_minutes" smallint DEFAULT 1320 NOT NULL;--> statement-breakpoint
ALTER TABLE "flaschen"."prefs" ADD COLUMN "quiet_end_minutes" smallint DEFAULT 360 NOT NULL;