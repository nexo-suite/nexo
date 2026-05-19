import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as authSchema from '../schema/auth.js';
import * as financeSchema from '../schema/finance.js';
import * as flaschenSchema from '../schema/flaschen.js';
import * as pushSchema from '../schema/push.js';

export * from '../schema/auth.js';
export * from '../schema/finance.js';
export * from '../schema/flaschen.js';
export * from '../schema/push.js';
export { withUser, type Tx } from './with-user.js';
export { loadHubProfile, type HubProfile } from './hub-profile.js';

let _db: ReturnType<typeof drizzle> | undefined;

export function initDb(url: string) {
	if (_db) return;
	_db = drizzle(postgres(url), {
		schema: { ...authSchema, ...financeSchema, ...flaschenSchema, ...pushSchema }
	});
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
	get(_target, prop) {
		if (!_db) throw new Error('Call initDb(DATABASE_URL) before using db');
		return Reflect.get(_db, prop);
	}
});
