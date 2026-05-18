import { error } from '@sveltejs/kit';
import { db, oauthApplications } from '@nexo/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const clientId = url.searchParams.get('client_id');
	const scope = url.searchParams.get('scope') ?? '';

	if (!clientId) error(400, 'Missing client_id');

	const [app] = await db
		.select({
			name: oauthApplications.name,
			icon: oauthApplications.icon
		})
		.from(oauthApplications)
		.where(eq(oauthApplications.clientId, clientId))
		.limit(1);

	if (!app) error(404, 'Unknown client');

	const scopes = scope
		.split(/\s+/)
		.map((s) => s.trim())
		.filter(Boolean);

	return {
		clientName: app.name ?? clientId,
		clientIcon: app.icon ?? null,
		scopes
	};
};
