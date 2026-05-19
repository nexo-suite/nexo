-- Move display_name and week_start_day from finance.user_settings to auth.user_preferences.
-- They're identity/locale preferences, not finance-specific, so they belong in the global table.

-- 1. Add the new columns to auth.user_preferences.
ALTER TABLE "auth"."user_preferences" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "auth"."user_preferences" ADD COLUMN "week_start_day" text DEFAULT 'monday' NOT NULL;--> statement-breakpoint

-- 2. Backfill from finance.user_settings:
--    For each user with finance settings, upsert their values into auth.user_preferences.
--    Users without an existing user_preferences row get one created.
--    Users with one already (display_name was just added so it's NULL; week_start_day is the
--    just-applied default 'monday') get their finance-stored values copied over.
INSERT INTO "auth"."user_preferences" ("user_id", "display_name", "week_start_day")
SELECT "user_id", "display_name", "week_start_day"
FROM "finance"."user_settings"
ON CONFLICT ("user_id") DO UPDATE
SET "display_name" = EXCLUDED."display_name",
    "week_start_day" = EXCLUDED."week_start_day";--> statement-breakpoint

-- 3. Drop the old columns from finance.user_settings — backfill is complete.
ALTER TABLE "finance"."user_settings" DROP COLUMN "display_name";--> statement-breakpoint
ALTER TABLE "finance"."user_settings" DROP COLUMN "week_start_day";
