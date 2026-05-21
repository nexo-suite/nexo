import { loadHubProfile } from '@nexo/db';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const profile = locals.user ? await loadHubProfile(locals.user.id) : null;
	return { user: locals.user, profile, correlationId: locals.correlationId };
};
