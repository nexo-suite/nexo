import type { Handle } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

const PROD_HOSTS = new Set([
	'krieger2501.de',
	'auth.krieger2501.de',
	'admin.krieger2501.de',
	'finance.krieger2501.de',
	'flaschen.krieger2501.de',
	'calorie.krieger2501.de',
	'bot.krieger2501.de'
]);

export interface OriginOptions {
	allowLocalhost?: boolean;
}

export function isAllowedOrigin(origin: string, options: OriginOptions = {}): boolean {
	try {
		const { hostname } = new URL(origin);
		if (PROD_HOSTS.has(hostname)) return true;
		if (options.allowLocalhost && (hostname === 'localhost' || hostname === '127.0.0.1')) {
			return true;
		}
		return false;
	} catch {
		return false;
	}
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const FORM_CONTENT_TYPES = [
	'application/x-www-form-urlencoded',
	'multipart/form-data',
	'text/plain'
];

export interface CsrfHandleOptions {
	allowLocalhost?: boolean;
	/**
	 * Pathnames (prefixes) that should bypass the CSRF check entirely.
	 * Use for HMAC-verified endpoints (e.g. GitHub webhooks).
	 */
	skipPaths?: string[];
}

/**
 * Builds a SvelteKit `Handle` that rejects unsafe cross-origin requests.
 *
 * Differences from the previous inline check:
 *  - Treats *missing* Origin AND Referer on form-like POSTs as failure (was: silent pass).
 *  - Validates against a hardcoded hostname allowlist (was: endsWith('.krieger2501.de')).
 */
export function csrfHandle(options: CsrfHandleOptions = {}): Handle {
	const { allowLocalhost = false, skipPaths = [] } = options;
	return async ({ event, resolve }) => {
		const { method, headers } = event.request;
		if (!UNSAFE_METHODS.has(method)) return resolve(event);

		for (const prefix of skipPaths) {
			if (event.url.pathname.startsWith(prefix)) return resolve(event);
		}

		const contentType = headers.get('content-type') ?? '';
		const isFormSubmission = FORM_CONTENT_TYPES.some((t) => contentType.includes(t));
		if (!isFormSubmission) return resolve(event);

		const origin = headers.get('origin');
		const referer = headers.get('referer');
		const locals = event.locals as { correlationId?: string };
		const correlationId = locals.correlationId ?? crypto.randomUUID().slice(0, 8);

		const sourceUrl = origin ?? referer;
		if (!sourceUrl || !isAllowedOrigin(sourceUrl, { allowLocalhost })) {
			error(403, {
				message: 'CSRF rejected',
				code: 'CSRF_REJECTED',
				correlationId
			} as App.Error);
		}

		return resolve(event);
	};
}
