import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Better Auth handles the token exchange server-side via the auth server.
// After a successful OAuth flow the auth server sets a session cookie and
// redirects the user back here. We just bounce them to the app root.
export const GET: RequestHandler = ({ url }) => {
	const next = url.searchParams.get('next') ?? '/';
	console.log('[finance] auth/callback next:', next);
	redirect(303, next);
};
