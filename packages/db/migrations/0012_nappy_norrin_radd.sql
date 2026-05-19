CREATE TABLE "flaschen"."date_override" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"kind" text NOT NULL,
	"slots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flaschen_date_override_user_date_uniq" UNIQUE("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "flaschen"."prefs" ADD COLUMN "weekly_windows" jsonb DEFAULT '{"1":[{"start":420,"end":1380}],"2":[{"start":420,"end":1380}],"3":[{"start":420,"end":1380}],"4":[{"start":420,"end":1380}],"5":[{"start":420,"end":1380}],"6":[{"start":420,"end":1380}],"7":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "flaschen"."date_override" ADD CONSTRAINT "date_override_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "flaschen_date_override_user_date_idx" ON "flaschen"."date_override" USING btree ("user_id","date");