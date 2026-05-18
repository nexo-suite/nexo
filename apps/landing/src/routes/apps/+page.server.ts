import { redirect, fail } from '@sveltejs/kit';
import {
	db,
	withUser,
	userAppAccess,
	userSettings,
	accounts,
	expenses,
	income,
	sessions
} from '@nexo/db';
import { firesOnDate } from '@nexo/ui/utils/recurrence';
import { parseUserAgent, deviceIcon } from '@nexo/ui/utils/ua-parser';
import { and, eq } from 'drizzle-orm';
import { env as publicEnv } from '$env/dynamic/public';
import { getAuth } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

async function getFinanceGlance(userId: string) {
	const { accountList, expenseList, incomeList } = await withUser(userId, async (tx) => {
		const [accountList, expenseList, incomeList] = await Promise.all([
			tx.select().from(accounts).where(eq(accounts.userId, userId)),
			tx
				.select()
				.from(expenses)
				.where(and(eq(expenses.userId, userId), eq(expenses.active, true))),
			tx.select().from(income).where(eq(income.userId, userId))
		]);
		return { accountList, expenseList, incomeList };
	});

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

	const userId = locals.user.id;

	const { access, settings } = await withUser(userId, async (tx) => {
		const [access, settings] = await Promise.all([
			tx.select().from(userAppAccess).where(eq(userAppAccess.userId, userId)),
			tx.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1)
		]);
		return { access, settings };
	});

	const rawSessions = await db.select().from(sessions).where(eq(sessions.userId, userId));

	const allowedApps = access.map((a) => a.app);
	const sessionNames = (settings[0]?.sessionNames as Record<string, string>) ?? {};

	const financeGlance = allowedApps.includes('finance') ? await getFinanceGlance(userId) : null;

	const currentSessionId = locals.session?.id ?? null;
	const sessionList = rawSessions.map((s) => {
		const parsed = parseUserAgent(s.userAgent);
		return {
			id: s.id,
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
		const userId = locals.user.id;

		const form = await request.formData();
		const displayName = (form.get('displayName') as string)?.trim() || null;
		const weekStartDay = (form.get('weekStartDay') as string)?.trim() || 'monday';

		try {
			await withUser(userId, (tx) =>
				tx
					.insert(userSettings)
					.values({ userId, displayName, weekStartDay })
					.onConflictDoUpdate({
						target: userSettings.userId,
						set: { displayName, weekStartDay, updatedAt: new Date() }
					})
			);
		} catch {
			return fail(500, { error: 'Failed to save settings' });
		}

		return { success: true, toast: 'Settings saved' };
	},

	revokeSession: async ({ locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Not authenticated' });

		const form = await request.formData();
		const sessionId = form.get('sessionId') as string;
		if (!sessionId) return fail(400, { error: 'Missing sessionId' });

		const [owned] = await db
			.select({ token: sessions.token })
			.from(sessions)
			.where(and(eq(sessions.id, sessionId), eq(sessions.userId, locals.user.id)))
			.limit(1);
		if (!owned) return fail(404, { error: 'Not found' });

		const auth = getAuth();
		try {
			await auth.api.revokeSession({
				body: { token: owned.token },
				headers: request.headers
			});
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
		const userId = locals.user.id;

		const form = await request.formData();
		const sessionId = form.get('sessionId') as string;
		const name = (form.get('name') as string)?.trim() || null;
		if (!sessionId) return fail(400, { error: 'Missing session ID' });

		const [owned] = await db
			.select({ id: sessions.id })
			.from(sessions)
			.where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
			.limit(1);
		if (!owned) return fail(404, { error: 'Not found' });

		try {
			await withUser(userId, async (tx) => {
				const [current] = await tx
					.select({ sessionNames: userSettings.sessionNames })
					.from(userSettings)
					.where(eq(userSettings.userId, userId))
					.limit(1);

				const names = (current?.sessionNames as Record<string, string>) ?? {};
				if (name) {
					names[sessionId] = name;
				} else {
					delete names[sessionId];
				}

				await tx
					.insert(userSettings)
					.values({ userId, sessionNames: names })
					.onConflictDoUpdate({
						target: userSettings.userId,
						set: { sessionNames: names, updatedAt: new Date() }
					});
			});
		} catch {
			return fail(500, { error: 'Failed to rename session' });
		}

		return { success: true, toast: 'Session renamed' };
	}
};
