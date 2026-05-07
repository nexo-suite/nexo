import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, users, sessions, oauthAccounts, verifications } from '@nexo/db';

const {
	BETTER_AUTH_SECRET,
	PUBLIC_AUTH_URL = 'https://auth.krieger2501.de'
} = process.env;

// Finance's own Better Auth instance — validates sessions against the shared DB.
// Social providers live only on the auth server; this instance just reads sessions.
export const auth = betterAuth({
	secret: BETTER_AUTH_SECRET,
	baseURL: PUBLIC_AUTH_URL,
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: { user: users, session: sessions, account: oauthAccounts, verification: verifications }
	})
});
