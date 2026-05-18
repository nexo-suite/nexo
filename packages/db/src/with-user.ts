import { sql } from 'drizzle-orm';
import { db } from './index.js';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Run `fn` inside a transaction with `app.current_user_id` pinned to `userId`.
 * RLS policies on finance.* and the user-data tables in auth.* read this GUC
 * to scope every row to the current user. set_config(name, value, is_local)
 * is the function form of SET LOCAL — unlike SET LOCAL it accepts a
 * parameterised value, so userId can never break out of the SQL string.
 */
export async function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
	return db.transaction(async (tx) => {
		await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`);
		return fn(tx);
	});
}
