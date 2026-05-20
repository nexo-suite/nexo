type LocaleEvent = {
	request: Request;
	cookies: {
		set: (
			name: string,
			value: string,
			opts: {
				path: string;
				maxAge?: number;
				sameSite?: 'lax' | 'strict' | 'none';
				httpOnly?: boolean;
				secure?: boolean;
			}
		) => void;
	};
};

const COOKIE = 'PARAGLIDE_LOCALE';
const MAX_AGE = 34_560_000;

/**
 * Ensures the request carries a `PARAGLIDE_LOCALE` cookie matching the user's
 * stored language preference. Runs ONLY when the cookie is missing from the
 * incoming request — once set, paraglide's built-in cookie strategy picks it
 * up on every subsequent request without any DB hit.
 *
 * - No cookie + no session → no-op (paraglide falls back to preferredLanguage).
 * - No cookie + signed-in user with stored language → mutate the request so
 *   paraglide reads the right locale this request, AND set the response cookie
 *   so future requests are zero-cost.
 * - Cookie present → no-op (trust whatever's already there).
 */
export async function ensureUserLocaleCookie(
	event: LocaleEvent,
	opts: {
		getSession: (request: Request) => Promise<{ user?: { id: string } | null } | null | undefined>;
		loadLocale: (userId: string) => Promise<string | null>;
	}
): Promise<void> {
	const cookieHeader = event.request.headers.get('cookie') ?? '';
	const hasCookie = cookieHeader.split(';').some((c) => c.trim().startsWith(`${COOKIE}=`));
	if (hasCookie) return;

	let userId: string | undefined;
	try {
		const session = await opts.getSession(event.request);
		userId = session?.user?.id;
	} catch {
		return;
	}
	if (!userId) return;

	const lang = await opts.loadLocale(userId).catch(() => null);
	if (!lang || lang === 'auto') return;

	event.cookies.set(COOKIE, lang, {
		path: '/',
		maxAge: MAX_AGE,
		sameSite: 'lax',
		httpOnly: false
	});

	const newHeaders = new Headers(event.request.headers);
	const merged = cookieHeader ? `${cookieHeader}; ${COOKIE}=${lang}` : `${COOKIE}=${lang}`;
	newHeaders.set('cookie', merged);
	event.request = new Request(event.request.clone(), { headers: newHeaders });
}
