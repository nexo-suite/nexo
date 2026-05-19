import { eq } from 'drizzle-orm';
import { db } from './index.js';
import { users, userPreferences } from '../schema/auth.js';

export type HubProfile = {
	name: string;
	email: string;
	displayName: string | null;
	language: string;
	theme: string;
	weekStartDay: string;
};

export async function loadHubProfile(userId: string): Promise<HubProfile> {
	const [user] = await db
		.select({ name: users.name, email: users.email })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);
	const [prefs] = await db
		.select({
			displayName: userPreferences.displayName,
			language: userPreferences.language,
			theme: userPreferences.theme,
			weekStartDay: userPreferences.weekStartDay
		})
		.from(userPreferences)
		.where(eq(userPreferences.userId, userId))
		.limit(1);
	return {
		name: user?.name ?? '',
		email: user?.email ?? '',
		displayName: prefs?.displayName ?? null,
		language: prefs?.language ?? 'auto',
		// Normally system would be preferred, but dark is currently under development, so default to light for now
		theme: prefs?.theme ?? 'light',
		weekStartDay: prefs?.weekStartDay ?? 'monday'
	};
}
