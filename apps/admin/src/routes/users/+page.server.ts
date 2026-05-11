import { db, allowedEmails, users, userAppAccess } from '@nexo/db';
import { sendAccessGrantedEmail, sendInviteEmail } from '@nexo/email';
import { eq, and, inArray } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { KNOWN_APPS } from '$lib/apps';
import type { PageServerLoad, Actions } from './$types';

const LANDING_URL = () => publicEnv.PUBLIC_LANDING_URL ?? 'https://krieger2501.de';
const RESEND_KEY = () => privateEnv.RESEND_API_KEY ?? '';

export const load: PageServerLoad = async () => {
	const [emailList, userList, accessList] = await Promise.all([
		db.select().from(allowedEmails),
		db.select().from(users),
		db.select().from(userAppAccess)
	]);

	const emailSet = new Set(emailList.map((e) => e.email));
	const accessMap = new Map<string, string[]>();
	for (const row of accessList) {
		const apps = accessMap.get(row.userId) ?? [];
		apps.push(row.app);
		accessMap.set(row.userId, apps);
	}

	const knownUserEmails = new Set(userList.map((u) => u.email));

	const entries = [
		...userList.map((u) => ({
			type: 'user' as const,
			id: u.id,
			email: u.email,
			name: u.name,
			image: u.image,
			createdAt: u.createdAt.toISOString(),
			allowed: emailSet.has(u.email),
			apps: accessMap.get(u.id) ?? []
		})),
		...emailList
			.filter((e) => !knownUserEmails.has(e.email))
			.map((e) => ({
				type: 'invited' as const,
				id: null,
				email: e.email,
				name: null,
				image: null,
				createdAt: e.addedAt.toISOString(),
				allowed: true,
				apps: [] as string[]
			}))
	];

	return { entries, knownApps: KNOWN_APPS };
};

export const actions: Actions = {
	addEmail: async ({ request }) => {
		const data = await request.formData();
		const email = (data.get('email') as string)?.trim().toLowerCase();
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { addError: 'Invalid email address.' });
		}
		try {
			await db.insert(allowedEmails).values({ email }).onConflictDoNothing();
		} catch {
			return fail(500, { addError: 'Failed to add email.' });
		}
		sendInviteEmail({ apiKey: RESEND_KEY(), to: email, landingUrl: LANDING_URL() }).catch((e) =>
			console.error('invite email failed:', e)
		);
		return { addSuccess: true };
	},

	removeEmail: async ({ request }) => {
		const data = await request.formData();
		const email = (data.get('email') as string)?.trim().toLowerCase();
		if (!email) return fail(400, { error: 'Missing email.' });
		await db.delete(allowedEmails).where(eq(allowedEmails.email, email));
		return { success: true };
	},

	updateAccess: async ({ request }) => {
		const data = await request.formData();
		const userId = data.get('userId') as string;
		if (!userId) return fail(400, { error: 'Missing userId.' });

		// Desired set comes as repeated "apps" fields (empty form = no fields = empty array)
		const desiredApps = data.getAll('apps') as string[];

		// Current set from DB
		const currentRows = await db
			.select()
			.from(userAppAccess)
			.where(eq(userAppAccess.userId, userId));
		const currentApps = currentRows.map((r) => r.app);

		const toGrant = desiredApps.filter((a) => !currentApps.includes(a));
		const toRevoke = currentApps.filter((a) => !desiredApps.includes(a));

		if (toGrant.length > 0) {
			await db
				.insert(userAppAccess)
				.values(toGrant.map((app) => ({ userId, app })))
				.onConflictDoNothing();
		}
		if (toRevoke.length > 0) {
			await db
				.delete(userAppAccess)
				.where(and(eq(userAppAccess.userId, userId), inArray(userAppAccess.app, toRevoke)));
		}

		// Send one email for all newly granted apps
		if (toGrant.length > 0) {
			const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
			if (user) {
				const grantedAppInfos = toGrant.map((id) => ({
					id,
					label: KNOWN_APPS.find((a) => a.id === id)?.label ?? id
				}));
				sendAccessGrantedEmail({
					apiKey: RESEND_KEY(),
					to: user.email,
					name: user.name ?? user.email,
					apps: grantedAppInfos,
					landingUrl: LANDING_URL()
				}).catch((e) => console.error('access email failed:', e));
			}
		}

		return { success: true };
	}
};
