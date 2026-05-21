import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { db, flaschenAccount, loadHubProfile } from '@nexo/db';
import { eq } from 'drizzle-orm';
import { logger } from '$lib/server/logger';
import {
	loadPrefs,
	savePrefs,
	refreshGrant,
	saveTokens,
	disconnectAccount,
	OAuthError
} from '$lib/server/flaschenpost';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const [account, profile, prefs] = await Promise.all([
		db.select().from(flaschenAccount).where(eq(flaschenAccount.userId, userId)).limit(1),
		loadHubProfile(userId),
		loadPrefs(userId)
	]);

	return {
		account: account[0] ?? null,
		profile,
		quietHours: {
			enabled: prefs.quietHoursEnabled,
			startMinutes: prefs.quietStartMinutes,
			endMinutes: prefs.quietEndMinutes
		},
		diagnostics: {
			userId,
			email: locals.user?.email ?? null,
			correlationId: locals.correlationId
		}
	};
};

export const actions: Actions = {
	connect: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const fd = await request.formData();
		const refreshToken = extractRefreshToken(fd.get('refreshToken'));
		if (!refreshToken) return fail(400, { error: 'MISSING_TOKEN' });

		try {
			const tokens = await refreshGrant(refreshToken);
			if (!tokens.employeeId) {
				return fail(500, {
					error: 'NO_EMPLOYEE_ID',
					correlationId: locals.correlationId
				});
			}
			await saveTokens(userId, tokens, { markConnected: true });
			logger.info('flaschen connected', { userId, employeeId: tokens.employeeId });
			return { success: true, toast: m.toast_connected() };
		} catch (e) {
			if (e instanceof OAuthError && e.isInvalidGrant) {
				return fail(401, { error: 'INVALID_TOKEN' });
			}
			const status = e instanceof OAuthError ? e.status : null;
			const body = e instanceof OAuthError ? e.body.slice(0, 500) : null;
			logger.error('flaschen connect failed', {
				userId,
				error: String(e),
				oauthStatus: status,
				oauthBody: body
			});
			if (status === 400 || status === 401) {
				return fail(401, { error: 'INVALID_TOKEN' });
			}
			return fail(500, {
				error: 'CONNECT_FAILED',
				correlationId: locals.correlationId
			});
		}
	},

	disconnect: async ({ locals }) => {
		const userId = locals.user!.id;
		await disconnectAccount(userId);
		return { success: true, toast: m.toast_disconnected() };
	},

	quietHours: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const fd = await request.formData();
		const enabled = fd.get('enabled') === 'on' || fd.get('enabled') === 'true';
		const startMinutes = parseTime(fd.get('startTime'));
		const endMinutes = parseTime(fd.get('endTime'));
		if (startMinutes === null || endMinutes === null) {
			return fail(400, { error: 'INVALID_TIME' });
		}
		try {
			await savePrefs(userId, {
				quietHoursEnabled: enabled,
				quietStartMinutes: startMinutes,
				quietEndMinutes: endMinutes
			});
		} catch (e) {
			logger.error('save quiet hours failed', { userId, error: String(e) });
			return fail(500, { error: 'DB_ERROR', correlationId: locals.correlationId });
		}
		return { success: true, toast: m.toast_saved() };
	}
};

function parseTime(raw: FormDataEntryValue | null): number | null {
	if (typeof raw !== 'string') return null;
	const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
	if (!m) return null;
	const h = Number(m[1]);
	const min = Number(m[2]);
	if (h < 0 || h > 23 || min < 0 || min > 59) return null;
	return h * 60 + min;
}

// Accept either a bare refresh_token or the full `oidc.user:…` JSON blob the
// portal stashes in localStorage. Returns null if nothing usable was pasted.
function extractRefreshToken(raw: FormDataEntryValue | null): string | null {
	if (typeof raw !== 'string') return null;
	const trimmed = raw.trim();
	if (!trimmed) return null;
	try {
		const parsed = JSON.parse(trimmed);
		if (typeof parsed === 'string') return parsed.trim() || null;
		if (parsed && typeof parsed === 'object') {
			const tok = (parsed as Record<string, unknown>).refresh_token;
			if (typeof tok === 'string' && tok.trim()) return tok.trim();
		}
	} catch {
		// not JSON — treat as raw token string
	}
	return trimmed;
}
