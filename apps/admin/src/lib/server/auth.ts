import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, users, sessions, oauthAccounts, verifications } from '@nexo/db';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

function createAuth() {
	return betterAuth({
		secret: env.BETTER_AUTH_SECRET,
		baseURL: publicEnv.PUBLIC_AUTH_URL,
		database: drizzleAdapter(db, {
			provider: 'pg',
			schema: {
				user: users,
				session: sessions,
				account: oauthAccounts,
				verification: verifications
			}
		})
	});
}

let _auth: ReturnType<typeof createAuth> | null = null;

export function getAuth(): ReturnType<typeof createAuth> {
	return (_auth ??= createAuth());
}

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
