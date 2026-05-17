CREATE TABLE "finance"."transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"account_id" uuid NOT NULL,
	"expense_id" uuid,
	"income_id" uuid,
	"debt_id" uuid,
	"type" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"fired_date" date NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "finance"."user_settings" ADD COLUMN "last_reconciled_at" date;--> statement-breakpoint
ALTER TABLE "finance"."transactions" ADD CONSTRAINT "transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "finance"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."transactions" ADD CONSTRAINT "transactions_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "finance"."expenses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."transactions" ADD CONSTRAINT "transactions_income_id_income_id_fk" FOREIGN KEY ("income_id") REFERENCES "finance"."income"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finance"."transactions" ADD CONSTRAINT "transactions_debt_id_debts_id_fk" FOREIGN KEY ("debt_id") REFERENCES "finance"."debts"("id") ON DELETE set null ON UPDATE no action;