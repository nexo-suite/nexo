ALTER TABLE "flaschen"."prefs" ALTER COLUMN "days_of_week" SET DEFAULT '[1,2,3,4,5,6]'::jsonb;--> statement-breakpoint
ALTER TABLE "flaschen"."prefs" ALTER COLUMN "time_start_minutes" SET DEFAULT 420;--> statement-breakpoint
ALTER TABLE "flaschen"."prefs" ALTER COLUMN "time_end_minutes" SET DEFAULT 1380;--> statement-breakpoint
ALTER TABLE "flaschen"."prefs" ADD COLUMN "shift_max_minutes" smallint DEFAULT 360 NOT NULL;--> statement-breakpoint
ALTER TABLE "flaschen"."seen_offer" ADD COLUMN "borderline" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "flaschen"."prefs" DROP COLUMN "min_reward_score";