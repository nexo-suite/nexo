CREATE SCHEMA "admin";
--> statement-breakpoint
CREATE TABLE "admin"."health_check_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ok" boolean NOT NULL,
	"latency_ms" integer,
	"error" text,
	"source" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "hcr_target_time_idx" ON "admin"."health_check_run" USING btree ("target","checked_at");