import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { jwt } from 'better-auth/plugins';
import { oauthProvider } from '@better-auth/oauth-provider';
import { db, allowedEmails, users, sessions, oauthAccounts, verifications } from '@nexo/db';
import { eq } from 'drizzle-orm';
import {
	BETTER_AUTH_SECRET,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET,
	DISCORD_CLIENT_ID,
	DISCORD_CLIENT_SECRET
} from '$env/dynamic/private';
import { PUBLIC_AUTH_URL } from '$env/dynamic/public';

export const auth = betterAuth({
	secret: BETTER_AUTH_SECRET,
	baseURL: PUBLIC_AUTH_URL,
	trustedOrigins: [PUBLIC_AUTH_URL],
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: { user: users, session: sessions, account: oauthAccounts, verification: verifications }
	}),
	socialProviders: {
		google: { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET },
		github: { clientId: GITHUB_CLIENT_ID, clientSecret: GITHUB_CLIENT_SECRET },
		discord: { clientId: DISCORD_CLIENT_ID, clientSecret: DISCORD_CLIENT_SECRET }
	},
	plugins: [
		// jwt() is required by oauthProvider for signing ID tokens
		jwt(),
		oauthProvider({
			loginPage: '/login',
			consentPage: '/oauth/consent',
			// Only the scopes the apps actually need
			scopes: ['openid', 'profile', 'email', 'offline_access'],
			// Access tokens live 1 hour; refresh tokens 30 days
			accessTokenExpiresIn: 3600,
			refreshTokenExpiresIn: 2592000,
			// Well-known routes exist at /.well-known/oauth-authorization-server
			// and /.well-known/openid-configuration in src/routes/
			silenceWarnings: {
				oauthAuthServerConfig: true,
				openidConfig: true
			}
		})
	],
	hooks: {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		after: async (ctx: any) => {
			try {
				const path = ctx.request?.url ? new URL(ctx.request.url).pathname : '';
				if (!path.includes('/callback')) return { response: undefined, headers: null };

				const email = ctx.context?.newSession?.user?.email;
				if (!email) return { response: undefined, headers: null };

				const [allowed] = await db
					.select()
					.from(allowedEmails)
					.where(eq(allowedEmails.email, email))
					.limit(1);

				if (!allowed) {
					const token = ctx.context?.newSession?.session?.token;
					if (token) {
						await db.delete(sessions).where(eq(sessions.token, token));
					}
					return {
						response: new Response(null, {
							status: 302,
							headers: { Location: '/not-authorized' }
						}),
						headers: null
					};
				}
			} catch (e) {
				console.error('[auth hook] after hook error:', e);
			}
			return { response: undefined, headers: null };
		}
	}
});
