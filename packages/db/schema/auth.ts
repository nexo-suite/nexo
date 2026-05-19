import { pgSchema, text, boolean, timestamp, date, index, primaryKey } from 'drizzle-orm/pg-core';

export const authSchema = pgSchema('auth');

// Better Auth core tables — names and columns must match what Better Auth expects.
// All IDs are text (Better Auth generates string IDs, not UUIDs).
// Table names match Better Auth defaults: "user", "session", "account", "verification".

export const users = authSchema.table('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const sessions = authSchema.table(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' })
	},
	(t) => [index('session_user_id_idx').on(t.userId)]
);

export const oauthAccounts = authSchema.table(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [index('account_user_id_idx').on(t.userId)]
);

export const verifications = authSchema.table(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [index('verification_identifier_idx').on(t.identifier)]
);

// OIDC provider plugin tables
export const oauthApplications = authSchema.table(
	'oauth_application',
	{
		id: text('id').primaryKey(),
		name: text('name'),
		icon: text('icon'),
		metadata: text('metadata'),
		clientId: text('client_id').unique(),
		clientSecret: text('client_secret'),
		redirectUrls: text('redirect_urls'),
		type: text('type'),
		disabled: boolean('disabled').default(false),
		userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }),
		updatedAt: timestamp('updated_at', { withTimezone: true })
	},
	(t) => [index('oauth_application_user_id_idx').on(t.userId)]
);

export const oauthAccessTokens = authSchema.table(
	'oauth_access_token',
	{
		id: text('id').primaryKey(),
		accessToken: text('access_token').unique(),
		refreshToken: text('refresh_token').unique(),
		accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
		clientId: text('client_id').references(() => oauthApplications.clientId, {
			onDelete: 'cascade'
		}),
		userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
		scopes: text('scopes'),
		createdAt: timestamp('created_at', { withTimezone: true }),
		updatedAt: timestamp('updated_at', { withTimezone: true })
	},
	(t) => [
		index('oauth_access_token_client_id_idx').on(t.clientId),
		index('oauth_access_token_user_id_idx').on(t.userId)
	]
);

export const oauthConsents = authSchema.table(
	'oauth_consent',
	{
		id: text('id').primaryKey(),
		clientId: text('client_id').references(() => oauthApplications.clientId, {
			onDelete: 'cascade'
		}),
		userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
		scopes: text('scopes'),
		createdAt: timestamp('created_at', { withTimezone: true }),
		updatedAt: timestamp('updated_at', { withTimezone: true }),
		consentGiven: boolean('consent_given')
	},
	(t) => [
		index('oauth_consent_client_id_idx').on(t.clientId),
		index('oauth_consent_user_id_idx').on(t.userId)
	]
);

// Custom tables for email whitelist and per-app access control
export const allowedEmails = authSchema.table('allowed_emails', {
	email: text('email').primaryKey(),
	addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull()
});

export const userAppAccess = authSchema.table(
	'user_app_access',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		app: text('app').notNull()
	},
	(t) => [primaryKey({ columns: [t.userId, t.app] })]
);

export const userPreferences = authSchema.table('user_preferences', {
	userId: text('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	displayName: text('display_name'),
	language: text('language').notNull().default('auto'),
	birthday: date('birthday'),
	theme: text('theme').notNull().default('system'),
	weekStartDay: text('week_start_day').notNull().default('monday'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export type User = typeof users.$inferSelect;
export type AllowedEmail = typeof allowedEmails.$inferSelect;
export type UserAppAccess = typeof userAppAccess.$inferSelect;
export type UserPreferences = typeof userPreferences.$inferSelect;
