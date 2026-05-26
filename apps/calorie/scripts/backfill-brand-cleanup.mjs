/**
 * One-shot backfill: re-clean tagged brand/name strings in calorie.foods_cache.
 * Safe to re-run — the cleaner is idempotent on already-clean inputs.
 *
 * Usage:
 *   pnpm --filter=@nexo/calorie backfill:brand-cleanup
 *
 * No tsx/ts-node dep — plain ESM, runs on bare Node. Imports @nexo/db's
 * compiled dist (no TS runtime needed). The cleaner is duplicated here
 * intentionally: it's 20 lines of pure code, low risk of divergence, and
 * importing TS source from a script would mean adding a TS runtime back.
 */
import { initDb, db, foodsCache, closeDb } from '@nexo/db';
import { sql } from 'drizzle-orm';

function titleCaseWord(w) {
	if (!w) return w;
	return w.charAt(0).toLocaleUpperCase() + w.slice(1).toLocaleLowerCase();
}

function cleanTagged(raw, max) {
	if (typeof raw !== 'string') return null;
	const cleaned = raw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.map((s) => s.replace(/^[a-z]{2,3}:/i, ''))
		.map((s) => s.replace(/-/g, ' '))
		.map((s) => s.split(/\s+/).filter(Boolean).map(titleCaseWord).join(' '))
		.filter(Boolean);
	const unique = [];
	const seen = new Set();
	for (const c of cleaned) {
		const key = c.toLocaleLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		unique.push(c);
		if (unique.length >= max) break;
	}
	return unique.length === 0 ? null : unique.join(' · ');
}

const cleanBrand = (raw) => cleanTagged(raw, 2);
const cleanName = (raw) => cleanTagged(raw, 1);

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

initDb(url);

const rows = await db
	.select({
		barcode: foodsCache.barcode,
		nameDe: foodsCache.nameDe,
		nameTr: foodsCache.nameTr,
		nameEn: foodsCache.nameEn,
		nameGeneric: foodsCache.nameGeneric,
		brand: foodsCache.brand
	})
	.from(foodsCache);

console.log(`Scanning ${rows.length} cached rows…`);

let updated = 0;
let skipped = 0;

for (const r of rows) {
	const next = {
		nameDe: cleanName(r.nameDe),
		nameTr: cleanName(r.nameTr),
		nameEn: cleanName(r.nameEn),
		nameGeneric: cleanName(r.nameGeneric),
		brand: cleanBrand(r.brand)
	};
	if (
		next.nameDe === r.nameDe &&
		next.nameTr === r.nameTr &&
		next.nameEn === r.nameEn &&
		next.nameGeneric === r.nameGeneric &&
		next.brand === r.brand
	) {
		skipped++;
		continue;
	}
	await db
		.update(foodsCache)
		.set(next)
		.where(sql`${foodsCache.barcode} = ${r.barcode}`);
	updated++;
}

console.log(`Done. Updated ${updated}, skipped ${skipped} (already clean).`);
await closeDb();
process.exit(0);
