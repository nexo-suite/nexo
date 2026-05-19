CREATE SCHEMA "flaschen";
--> statement-breakpoint
CREATE SCHEMA "push";
--> statement-breakpoint
CREATE TABLE "flaschen"."account" (
	"user_id" text PRIMARY KEY NOT NULL,
	"employee_id" text NOT NULL,
	"username" text,
	"encrypted_refresh_token" text NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"access_token_expires_at" timestamp with time zone NOT NULL,
	"last_login_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_poll_at" timestamp with time zone,
	"last_poll_ok" boolean,
	"last_poll_error" text,
	"needs_reconnect" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flaschen"."poll_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ok" boolean NOT NULL,
	"offers_seen" integer DEFAULT 0 NOT NULL,
	"matches" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "flaschen"."prefs" (
	"user_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"days_of_week" jsonb DEFAULT '[1,2,3,4,5]'::jsonb NOT NULL,
	"time_start_minutes" smallint DEFAULT 0 NOT NULL,
	"time_end_minutes" smallint DEFAULT 1440 NOT NULL,
	"warehouse_ids" jsonb DEFAULT '[3]'::jsonb NOT NULL,
	"workgroup_ids" jsonb DEFAULT '[1]'::jsonb NOT NULL,
	"min_reward_score" smallint DEFAULT 0 NOT NULL,
	"include_marketplace" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flaschen"."seen_location" (
	"user_id" text NOT NULL,
	"warehouse_id" integer NOT NULL,
	"warehouse_name" text NOT NULL,
	"workgroup_id" integer NOT NULL,
	"workgroup_name" text NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flaschen_seen_location_uniq" UNIQUE("user_id","warehouse_id","workgroup_id")
);
--> statement-breakpoint
CREATE TABLE "flaschen"."seen_offer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"matched" boolean DEFAULT false NOT NULL,
	"notified" boolean DEFAULT false NOT NULL,
	"offer" jsonb NOT NULL,
	CONSTRAINT "flaschen_seen_offer_user_dedupe_uniq" UNIQUE("user_id","dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "push"."subscription" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"app" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "push_subscription_user_app_endpoint_uniq" UNIQUE("user_id","app","endpoint")
);
--> statement-breakpoint
ALTER TABLE "flaschen"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flaschen"."poll_log" ADD CONSTRAINT "poll_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flaschen"."prefs" ADD CONSTRAINT "prefs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flaschen"."seen_location" ADD CONSTRAINT "seen_location_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flaschen"."seen_offer" ADD CONSTRAINT "seen_offer_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push"."subscription" ADD CONSTRAINT "subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flaschen_poll_log_user_ran_idx" ON "flaschen"."poll_log" USING btree ("user_id","ran_at");--> statement-breakpoint
CREATE INDEX "flaschen_seen_offer_user_first_seen_idx" ON "flaschen"."seen_offer" USING btree ("user_id","first_seen_at");--> statement-breakpoint
CREATE INDEX "push_subscription_user_app_idx" ON "push"."subscription" USING btree ("user_id","app");