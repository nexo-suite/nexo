import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logger } from '$lib/server/logger';

// Better Auth handles the token exchange server-side via the auth server.
// After a successful OAuth flow the auth server sets a session cookie and
// redirects the user back here. We just bounce them to the app root.
export const GET: RequestHandler = ({ url }) => {
	const raw = url.searchParams.get('next') ?? '/';
	// Only allow same-origin redirects — reject any value that contains a scheme or host.
	const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
	logger.info('auth/callback', { next });
	redirect(303, next);
};
