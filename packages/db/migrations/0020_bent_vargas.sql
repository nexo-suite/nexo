CREATE TABLE "calorie"."foods_search_cache" (
	"query_normalized" text NOT NULL,
	"locale" text NOT NULL,
	"barcodes" text[] NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "foods_search_cache_query_normalized_locale_pk" PRIMARY KEY("query_normalized","locale")
);
--> statement-breakpoint
ALTER TABLE "calorie"."foods_cache" ADD COLUMN "name_tr" text;