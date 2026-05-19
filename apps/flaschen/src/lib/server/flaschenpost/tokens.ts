import { db, flaschenAccount } from '@nexo/db';
import { eq } from 'drizzle-orm';
import { decrypt, encrypt } from './crypto';
import { OAuthError, refreshGrant, type ParsedTokens } from './oauth';

export class ReconnectRequiredError extends Error {
	constructor(public readonly userId: string) {
		super(`refresh-token grant rejected for user ${userId}`);
		this.name = 'ReconnectRequiredError';
	}
}

export type AccountRow = typeof flaschenAccount.$inferSelect;

export async function loadAccount(userId: string): Promise<AccountRow | null> {
	const rows = await db
		.select()
		.from(flaschenAccount)
		.where(eq(flaschenAccount.userId, userId))
		.limit(1);
	return rows[0] ?? null;
}

export async function saveTokens(
	userId: string,
	tokens: ParsedTokens,
	options: { username?: string; markConnected?: boolean } = {}
): Promise<void> {
	const set = {
		encryptedAccessToken: encrypt(tokens.accessToken),
		encryptedRefreshToken: encrypt(tokens.refreshToken),
		accessTokenExpiresAt: tokens.expiresAt,
		updatedAt: new Date()
	} satisfies Partial<AccountRow>;

	const existing = await loadAccount(userId);
	if (!existing) {
		if (!tokens.employeeId)
			throw new Error('cannot create flaschen account without employeeId from token');
		await db.insert(flaschenAccount).values({
			userId,
			employeeId: tokens.employeeId,
			username: options.username ?? null,
			lastLoginAt: new Date(),
			needsReconnect: false,
			...set
		});
		return;
	}

	await db
		.update(flaschenAccount)
		.set({
			...set,
			...(tokens.employeeId ? { employeeId: tokens.employeeId } : {}),
			...(options.username ? { username: options.username } : {}),
			...(options.markConnected ? { lastLoginAt: new Date(), needsReconnect: false } : {})
		})
		.where(eq(flaschenAccount.userId, userId));
}

async function markNeedsReconnect(userId: string, reason: string): Promise<void> {
	await db
		.update(flaschenAccount)
		.set({ needsReconnect: true, lastPollError: reason, updatedAt: new Date() })
		.where(eq(flaschenAccount.userId, userId));
}

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export async function ensureFreshAccessToken(userId: string): Promise<string> {
	const acct = await loadAccount(userId);
	if (!acct) throw new Error(`no flaschen account for user ${userId}`);
	if (acct.needsReconnect) throw new ReconnectRequiredError(userId);

	if (acct.accessTokenExpiresAt.getTime() - Date.now() > REFRESH_BUFFER_MS) {
		return decrypt(acct.encryptedAccessToken);
	}

	try {
		const tokens = await refreshGrant(decrypt(acct.encryptedRefreshToken));
		await saveTokens(userId, tokens);
		return tokens.accessToken;
	} catch (err) {
		if (err instanceof OAuthError && err.isInvalidGrant) {
			await markNeedsReconnect(userId, 'refresh_token rejected');
			throw new ReconnectRequiredError(userId);
		}
		throw err;
	}
}

export async function disconnectAccount(userId: string): Promise<void> {
	await db.delete(flaschenAccount).where(eq(flaschenAccount.userId, userId));
}
