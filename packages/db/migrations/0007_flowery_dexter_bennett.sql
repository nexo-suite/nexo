ALTER TABLE "finance"."user_settings" ADD COLUMN "default_account_id" uuid;--> statement-breakpoint
ALTER TABLE "finance"."user_settings" ADD COLUMN "hide_cents" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "finance"."user_settings" ADD COLUMN "forecast_days" text DEFAULT '90' NOT NULL;--> statement-breakpoint
ALTER TABLE "finance"."user_settings" ADD COLUMN "include_debt_in_forecast" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "finance"."user_settings" ADD CONSTRAINT "user_settings_default_account_id_accounts_id_fk" FOREIGN KEY ("default_account_id") REFERENCES "finance"."accounts"("id") ON DELETE set null ON UPDATE no action;