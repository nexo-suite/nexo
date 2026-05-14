import { LANGUAGES, DEFAULT_LANGUAGE, type Language } from './types';

/**
 * Parse an Accept-Language header and return the best matching supported language.
 * Falls back to DEFAULT_LANGUAGE if no match is found.
 */
export function detectLanguage(acceptLanguage: string | null): Language {
	if (!acceptLanguage) return DEFAULT_LANGUAGE;

	const entries = acceptLanguage
		.split(',')
		.map((part) => {
			const [tag, q] = part.trim().split(';q=');
			return { tag: tag.trim().toLowerCase(), quality: q ? parseFloat(q) : 1.0 };
		})
		.sort((a, b) => b.quality - a.quality);

	for (const { tag } of entries) {
		const exact = LANGUAGES.find((l) => l === tag);
		if (exact) return exact;

		const prefix = tag.split('-')[0];
		const match = LANGUAGES.find((l) => l === prefix);
		if (match) return match;
	}

	return DEFAULT_LANGUAGE;
}

/**
 * Resolve the effective language for a request.
 * Priority: user preference > cookie > Accept-Language header > default.
 */
export function resolveLanguage(opts: {
	userPreference?: string | null;
	cookie?: string | null;
	acceptLanguage?: string | null;
}): Language {
	if (opts.userPreference && opts.userPreference !== 'auto') {
		const pref = LANGUAGES.find((l) => l === opts.userPreference);
		if (pref) return pref;
	}

	if (opts.cookie) {
		const fromCookie = LANGUAGES.find((l) => l === opts.cookie);
		if (fromCookie) return fromCookie;
	}

	return detectLanguage(opts.acceptLanguage ?? null);
}
