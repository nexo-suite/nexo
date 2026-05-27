import { fail } from '@sveltejs/kit';
import { withUser, profiles, weightLogs } from '@nexo/db';
import { and, eq, gte } from 'drizzle-orm';
import { logger } from '$lib/server/logger';
import type { Goal } from '$lib/types';
import type { PageServerLoad, Actions } from './$types';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const since = new Date(Date.now() - ONE_YEAR_MS);
	const sinceDate = since.toISOString().slice(0, 10);

	const data = await withUser(userId, async (tx) => {
		const [profileRow] = await tx
			.select()
			.from(profiles)
			.where(eq(profiles.userId, userId))
			.limit(1);

		const weights = await tx
			.select()
			.from(weightLogs)
			.where(and(eq(weightLogs.userId, userId), gte(weightLogs.date, sinceDate)))
			.orderBy(weightLogs.date);

		return { profileRow, weights };
	});

	return {
		weights: data.weights.map((w) => ({ date: w.date, kg: Number(w.kg) })),
		startWeightKg: data.profileRow?.weightKg ? Number(data.profileRow.weightKg) : null,
		targetWeightKg: data.profileRow?.targetWeightKg ? Number(data.profileRow.targetWeightKg) : null,
		goal: (data.profileRow?.goal as Goal | null) ?? null
	};
};

function isoDate(d: Date): string {
	return d.toISOString().slice(0, 10);
}

export const actions: Actions = {
	logWeight: async ({ locals, request }) => {
		const userId = locals.user!.id;
		const form = await request.formData();
		const kg = Number(form.get('kg') ?? 0);
		const dateRaw = (form.get('date') as string) || isoDate(new Date());

		if (!kg || kg < 20 || kg > 400) {
			return fail(400, { error: 'INVALID_WEIGHT', correlationId: locals.correlationId });
		}

		const today = isoDate(new Date());
		const earliest = isoDate(new Date(Date.now() - SEVEN_DAYS_MS));
		if (dateRaw > today || dateRaw < earliest) {
			return fail(400, { error: 'INVALID_DATE', correlationId: locals.correlationId });
		}

		try {
			await withUser(userId, (tx) =>
				tx
					.insert(weightLogs)
					.values({ userId, date: dateRaw, kg: String(kg) })
					.onConflictDoUpdate({
						target: [weightLogs.userId, weightLogs.date],
						set: { kg: String(kg), loggedAt: new Date() }
					})
			);
			return { success: true };
		} catch (e) {
			logger.error('logWeight failed', {
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'LOG_WEIGHT_FAILED', correlationId: locals.correlationId });
		}
	},

	deleteWeight: async ({ locals, request }) => {
		const userId = locals.user!.id;
		const form = await request.formData();
		const dateRaw = (form.get('date') as string) ?? '';
		if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
			return fail(400, { error: 'INVALID_DATE', correlationId: locals.correlationId });
		}
		try {
			await withUser(userId, (tx) =>
				tx
					.delete(weightLogs)
					.where(and(eq(weightLogs.userId, userId), eq(weightLogs.date, dateRaw)))
			);
			return { success: true };
		} catch (e) {
			logger.error('deleteWeight failed', {
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'DELETE_WEIGHT_FAILED', correlationId: locals.correlationId });
		}
	}
};
