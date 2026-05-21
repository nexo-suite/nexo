import { error } from '@sveltejs/kit';
import { createGetAuth } from '@nexo/security';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export const getAuth = createGetAuth(() => ({
	secret: env.BETTER_AUTH_SECRET,
	baseURL: publicEnv.PUBLIC_AUTH_URL
}));

export function requireOwner(locals: App.Locals): void {
	const adminEmail = env.ADMIN_EMAIL;
	if (!adminEmail || locals.user?.email !== adminEmail) {
		error(403, {
			message: 'Forbidden',
			code: 'FORBIDDEN',
			correlationId: locals.correlationId
		});
	}
}
