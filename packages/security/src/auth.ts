import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, users, sessions, oauthAccounts, verifications } from '@nexo/db';

export interface ConsumerAuthOptions {
	secret: string;
	baseURL: string;
}

export function createConsumerAuth({ secret, baseURL }: ConsumerAuthOptions) {
	return betterAuth({
		secret,
		baseURL,
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

export type ConsumerAuth = ReturnType<typeof createConsumerAuth>;

export function createGetAuth(getOpts: () => ConsumerAuthOptions): () => ConsumerAuth {
	let _auth: ConsumerAuth | null = null;
	return () => (_auth ??= createConsumerAuth(getOpts()));
}
