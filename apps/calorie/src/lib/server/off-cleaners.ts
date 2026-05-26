/**
 * Pure normalization helpers for OFF tagged strings. No SvelteKit, no DB —
 * safe to import from standalone scripts (e.g. backfill).
 *
 * OFF stores names and brands as comma-separated tagged strings like
 * "Danone, en:activia, xx:brooklea-active". We strip language prefixes,
 * de-slugify, title-case, dedupe, and trim to something readable.
 *
 * Idempotent on already-clean inputs.
 */

function titleCaseWord(w: string): string {
	if (!w) return w;
	// Use locale-aware case so umlauts and other diacritics survive intact.
	return w.charAt(0).toLocaleUpperCase() + w.slice(1).toLocaleLowerCase();
}

function cleanTagged(raw: unknown, max: number): string | null {
	if (typeof raw !== 'string') return null;
	const cleaned = raw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.map((s) => s.replace(/^[a-z]{2,3}:/i, ''))
		.map((s) => s.replace(/-/g, ' '))
		// Title-case by splitting on whitespace rather than regex word-matching.
		// JS `\w` without the `u` flag is ASCII-only, so "Brötchen" gets split
		// at the umlaut and the second half title-cased separately ("BröTchen").
		// Whole-word splitting sidesteps the issue entirely.
		.map((s) => s.split(/\s+/).filter(Boolean).map(titleCaseWord).join(' '))
		.filter(Boolean);
	const unique: string[] = [];
	const seen = new Set<string>();
	for (const c of cleaned) {
		const key = c.toLocaleLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		unique.push(c);
		if (unique.length >= max) break;
	}
	return unique.length === 0 ? null : unique.join(' · ');
}

/** Brand: keep up to 2 distinct entries. */
export function cleanBrand(raw: unknown): string | null {
	return cleanTagged(raw, 2);
}

/** Name: prefer just the first cleaned token. */
export function cleanName(raw: unknown): string | null {
	return cleanTagged(raw, 1);
}
