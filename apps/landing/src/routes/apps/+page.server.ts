import { redirect, fail } from '@sveltejs/kit';
import { db, userAppAccess, userSettings, accounts, expenses, income, sessions } from '@nexo/db';
import { firesOnDate } from '@nexo/ui/utils/recurrence';
import { parseUserAgent, deviceIcon } from '@nexo/ui/utils/ua-parser';
import { eq, and } from 'drizzle-orm';
import { env as publicEnv } from '$env/dynamic/public';
import { getAuth } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

async function getFinanceGlance(userId: string) {
	const [accountList, expenseList, incomeList] = await Promise.all([
		db.select().from(accounts).where(eq(accounts.userId, userId)),
		db
			.select()
			.from(expenses)
			.where(and(eq(expenses.userId, userId), eq(expenses.active, true))),
		db.select().from(income).where(eq(income.userId, userId))
	]);

	if (accountList.length === 0) return null;

	const now = new Date();
	now.setHours(0, 0, 0, 0);

	const liquid = accountList
		.filter((a) => a.includeInTotal)
		.reduce((s, a) => s + Number(a.balance), 0);

	const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
	const daysInMonth = monthEnd.getDate();

	let monthExpenses = 0;
	for (const e of expenseList) {
		if (e.recurrence === 'once') continue;
		for (let day = 1; day <= daysInMonth; day++) {
			const d = new Date(now.getFullYear(), now.getMonth(), day);
			if (firesOnDate(e.recurrence, e.dayOfMonth, e.dueDate, e.startingMonth, d, now)) {
				monthExpenses += Number(e.amount);
			}
		}
	}

	let monthIncome = 0;
	for (const inc of incomeList) {
		if (inc.recurrence === 'once') continue;
		for (let day = 1; day <= daysInMonth; day++) {
			const d = new Date(now.getFullYear(), now.getMonth(), day);
			if (
				firesOnDate(inc.recurrence, inc.dayOfMonth, inc.expectedDate, inc.startingMonth, d, now)
			) {
				monthIncome += Number(inc.amount);
			}
		}
	}

	// Simple 30-day lookahead for tightest point
	let bal = liquid;
	let lowestBal = liquid;
	let lowestDay = 0;
	for (let i = 1; i <= 30; i++) {
		const d = new Date(now);
		d.setDate(d.getDate() + i);
		for (const e of expenseList) {
			if (firesOnDate(e.recurrence, e.dayOfMonth, e.dueDate, e.startingMonth, d, now)) {
				bal -= Number(e.amount);
			}
		}
		for (const inc of incomeList) {
			if (inc.received && inc.recurrence === 'once') continue;
			if (
				firesOnDate(inc.recurrence, inc.dayOfMonth, inc.expectedDate, inc.startingMonth, d, now)
			) {
				bal += Number(inc.amount);
			}
		}
		if (bal < lowestBal) {
			lowestBal = bal;
			lowestDay = i;
		}
	}

	const lowestDate = new Date(now);
	lowestDate.setDate(lowestDate.getDate() + lowestDay);

	return {
		liquid,
		monthExpenses,
		monthIncome,
		tightDay:
			lowestDay > 0
				? lowestDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })
				: null,
		tightAmount: lowestBal
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		const authURL = publicEnv.PUBLIC_AUTH_URL;
		const landingURL = publicEnv.PUBLIC_LANDING_URL ?? 'https://krieger2501.de';
		redirect(303, `${authURL}/login?redirectTo=${encodeURIComponent(`${landingURL}/apps`)}`);
	}

	const [access, settings, rawSessions] = await Promise.all([
		db.select().from(userAppAccess).where(eq(userAppAccess.userId, locals.user.id)),
		db.select().from(userSettings).where(eq(userSettings.userId, locals.user.id)).limit(1),
		db.select().from(sessions).where(eq(sessions.userId, locals.user.id))
	]);

	const allowedApps = access.map((a) => a.app);
	const sessionNames = (settings[0]?.sessionNames as Record<string, string>) ?? {};

	const financeGlance = allowedApps.includes('finance')
		? await getFinanceGlance(locals.user.id)
		: null;

	const currentSessionId = locals.session?.id ?? null;
	const sessionList = rawSessions.map((s) => {
		const parsed = parseUserAgent(s.userAgent);
		return {
			id: s.id,
			token: s.token,
			isCurrent: s.id === currentSessionId,
			name: sessionNames[s.id] ?? null,
			icon: deviceIcon(parsed.device, parsed.os),
			device: parsed.device,
			browser: parsed.browser,
			os: parsed.os,
			summary: parsed.summary,
			ip: s.ipAddress,
			lastActive: s.updatedAt,
			createdAt: s.createdAt
		};
	});

	return {
		user: { name: locals.user.name, email: locals.user.email, image: locals.user.image },
		allowedApps,
		displayName: settings[0]?.displayName ?? '',
		weekStartDay: settings[0]?.weekStartDay ?? 'monday',
		financeGlance,
		sessions: sessionList
	};
};

export const actions: Actions = {
	save: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });

		const form = await request.formData();
		const displayName = (form.get('displayName') as string)?.trim() || null;
		const weekStartDay = (form.get('weekStartDay') as string)?.trim() || 'monday';

		try {
			await db
				.insert(userSettings)
				.values({ userId: locals.user.id, displayName, weekStartDay })
				.onConflictDoUpdate({
					target: userSettings.userId,
					set: { displayName, weekStartDay, updatedAt: new Date() }
				});
		} catch {
			return fail(500, { error: 'Failed to save settings' });
		}

		return { success: true, toast: 'Settings saved' };
	},

	revokeSession: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });

		const form = await request.formData();
		const token = form.get('token') as string;
		if (!token) return fail(400, { error: 'Missing token' });

		const auth = getAuth();
		try {
			await auth.api.revokeSession({ body: { token }, headers: request.headers });
		} catch {
			return fail(500, { error: 'Failed to revoke session' });
		}

		return { success: true, toast: 'Session revoked' };
	},

	revokeOtherSessions: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });

		const auth = getAuth();
		try {
			await auth.api.revokeOtherSessions({ headers: request.headers });
		} catch {
			return fail(500, { error: 'Failed to revoke sessions' });
		}

		return { success: true, toast: 'Other sessions revoked' };
	},

	renameSession: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });

		const form = await request.formData();
		const sessionId = form.get('sessionId') as string;
		const name = (form.get('name') as string)?.trim() || null;
		if (!sessionId) return fail(400, { error: 'Missing session ID' });

		try {
			const [current] = await db
				.select({ sessionNames: userSettings.sessionNames })
				.from(userSettings)
				.where(eq(userSettings.userId, locals.user.id))
				.limit(1);

			const names = (current?.sessionNames as Record<string, string>) ?? {};
			if (name) {
				names[sessionId] = name;
			} else {
				delete names[sessionId];
			}

			await db
				.insert(userSettings)
				.values({ userId: locals.user.id, sessionNames: names })
				.onConflictDoUpdate({
					target: userSettings.userId,
					set: { sessionNames: names, updatedAt: new Date() }
				});
		} catch {
			return fail(500, { error: 'Failed to rename session' });
		}

		return { success: true, toast: 'Session renamed' };
	}
};
