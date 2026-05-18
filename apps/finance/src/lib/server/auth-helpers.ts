import { db, accounts } from '@nexo/db';
import { and, eq } from 'drizzle-orm';

export class InvalidAccountError extends Error {
	constructor() {
		super('INVALID_ACCOUNT');
		this.name = 'InvalidAccountError';
	}
}

/**
 * Throws InvalidAccountError if accountId is set but does not belong to the
 * given user. Pass `null`/`undefined`/empty for "unattached", which is allowed.
 *
 * Why this matters: form actions accept account_id from client form data and
 * write it into rows the reconciler then uses to mutate `accounts.balance`.
 * Without this check, a forged account_id pointing at another user's account
 * leads to cross-user balance manipulation.
 */
export async function assertAccountOwned(
	accountId: string | null | undefined,
	userId: string
): Promise<void> {
	if (!accountId) return;
	const [a] = await db
		.select({ id: accounts.id })
		.from(accounts)
		.where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
		.limit(1);
	if (!a) throw new InvalidAccountError();
}
