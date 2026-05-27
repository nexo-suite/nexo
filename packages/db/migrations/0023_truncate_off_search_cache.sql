-- Clear the derived OFF free-text search cache.
--
-- Existing rows reference duplicate "Toasted Bread Rolls"-style entries that
-- the new dedup pass in apps/calorie/src/lib/server/off.ts eliminates. Without
-- this, users would keep seeing duplicate hits for up to 30 days from cached
-- queries. Safe to truncate — foods_search_cache is purely a derived cache,
-- regenerated on the next OFF call per (query, locale).
TRUNCATE TABLE "calorie"."foods_search_cache";
