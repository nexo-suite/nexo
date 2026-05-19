import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { jwt } from 'better-auth/plugins';
import { oauthProvider } from '@better-auth/oauth-provider';
import { db, allowedEmails, users, sessions, oauthAccounts, verifications } from '@nexo/db';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { logger } from './logger';

function createAuth() {
	const baseURL = publicEnv.PUBLIC_AUTH_URL!;
	const trustedOrigins: string[] = [baseURL];
	if (env.FINANCE_URL) trustedOrigins.push(env.FINANCE_URL);
	if (env.ADMIN_URL) trustedOrigins.push(env.ADMIN_URL);
	if (env.FLASCHEN_URL) trustedOrigins.push(env.FLASCHEN_URL);
	if (publicEnv.PUBLIC_LANDING_URL) trustedOrigins.push(publicEnv.PUBLIC_LANDING_URL);
	const isProduction = baseURL.startsWith('https://');
	return betterAuth({
		secret: env.BETTER_AUTH_SECRET!,
		baseURL,
		trustedOrigins,
		advanced: {
			useSecureCookies: isProduction,
			...(isProduction && {
				crossSubDomainCookies: {
					enabled: true,
					domain: '.krieger2501.de'
				}
			})
		},
		database: drizzleAdapter(db, {
			provider: 'pg',
			schema: {
				user: users,
				session: sessions,
				account: oauthAccounts,
				verification: verifications
			}
		}),
		socialProviders: {
			google: { clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET! },
			github: { clientId: env.GITHUB_CLIENT_ID!, clientSecret: env.GITHUB_CLIENT_SECRET! },
			discord: { clientId: env.DISCORD_CLIENT_ID!, clientSecret: env.DISCORD_CLIENT_SECRET! }
		},
		plugins: [
			jwt(),
			oauthProvider({
				loginPage: '/login',
				consentPage: '/oauth/consent',
				scopes: ['openid', 'profile', 'email', 'offline_access'],
				accessTokenExpiresIn: 3600,
				refreshTokenExpiresIn: 2592000,
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
					logger.info('after-hook', { path });
					if (!path.includes('/callback')) return { response: undefined, headers: null };

					const email = ctx.context?.newSession?.user?.email;
					const provider = ctx.context?.newSession?.account?.providerId ?? null;
					logger.info('oauth callback', { email: email ?? null, provider });
					if (!email) return { response: undefined, headers: null };

					const [allowed] = await db
						.select()
						.from(allowedEmails)
						.where(eq(allowedEmails.email, email))
						.limit(1);

					if (!allowed) {
						logger.warn('access denied', { email });
						const token = ctx.context?.newSession?.session?.token;
						if (token) {
							await db.delete(sessions).where(eq(sessions.token, token));
						}
						return {
							response: new Response(null, {
								status: 302,
								headers: { Location: '/login?error=not_authorized' }
							}),
							headers: null
						};
					}
				} catch (e) {
					logger.error('after hook error', { error: String(e) });
				}
				return { response: undefined, headers: null };
			}
		}
	});
}

let _auth: ReturnType<typeof createAuth> | null = null;

export function getAuth(): ReturnType<typeof createAuth> {
	return (_auth ??= createAuth());
}
