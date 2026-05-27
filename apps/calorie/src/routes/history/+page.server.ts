import { withUser, entries as entriesTable, weightLogs, profiles } from '@nexo/db';
import { and, eq, gte, sql, asc } from 'drizzle-orm';
import type { HistoryDay } from '$lib/types';
import type { PageServerLoad } from './$types';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;
	const since = new Date(Date.now() - NINETY_DAYS_MS);
	const sinceDate = since.toISOString().slice(0, 10);

	const data = await withUser(userId, async (tx) => {
		const [profileRow] = await tx
			.select({ targetKcal: profiles.targetKcal })
			.from(profiles)
			.where(eq(profiles.userId, userId))
			.limit(1);

		const rawEntries = await tx
			.select({
				id: entriesTable.id,
				loggedAt: entriesTable.loggedAt,
				foodName: entriesTable.foodName,
				grams: entriesTable.grams,
				unit: entriesTable.unit,
				kcal: entriesTable.kcal,
				proteinG: entriesTable.proteinG,
				carbsG: entriesTable.carbsG,
				fatG: entriesTable.fatG,
				fiberG: entriesTable.fiberG,
				sugarG: entriesTable.sugarG,
				mealSlot: entriesTable.mealSlot,
				dateKey: sql<string>`to_char(${entriesTable.loggedAt}::date, 'YYYY-MM-DD')`
			})
			.from(entriesTable)
			.where(and(eq(entriesTable.userId, userId), gte(entriesTable.loggedAt, since)))
			.orderBy(asc(entriesTable.loggedAt));

		const weights = await tx
			.select({ date: weightLogs.date, kg: weightLogs.kg })
			.from(weightLogs)
			.where(and(eq(weightLogs.userId, userId), gte(weightLogs.date, sinceDate)))
			.orderBy(weightLogs.date);

		return { rawEntries, weights, profileRow };
	});

	const weightByDate = new Map<string, number>(data.weights.map((w) => [w.date, Number(w.kg)]));

	const byDay = new Map<string, HistoryDay>();
	for (const r of data.rawEntries) {
		const day = byDay.get(r.dateKey) ?? {
			date: r.dateKey,
			kcal: 0,
			entryCount: 0,
			proteinG: 0,
			carbsG: 0,
			fatG: 0,
			fiberG: 0,
			weightKg: weightByDate.get(r.dateKey) ?? null,
			entries: []
		};
		const kcal = Number(r.kcal);
		const protein = Number(r.proteinG);
		const carbs = Number(r.carbsG);
		const fat = Number(r.fatG);
		const fiber = r.fiberG != null ? Number(r.fiberG) : 0;
		day.kcal += kcal;
		day.entryCount += 1;
		day.proteinG += protein;
		day.carbsG += carbs;
		day.fatG += fat;
		day.fiberG += fiber;
		day.entries.push({
			id: r.id,
			loggedAt: r.loggedAt.toISOString(),
			foodName: r.foodName,
			grams: Number(r.grams),
			unit: r.unit,
			kcal,
			proteinG: protein,
			carbsG: carbs,
			fatG: fat,
			fiberG: r.fiberG != null ? Number(r.fiberG) : null,
			sugarG: r.sugarG != null ? Number(r.sugarG) : null,
			mealSlot: r.mealSlot
		});
		byDay.set(r.dateKey, day);
	}

	// Pull in weight-only days too so the recent list shows them when present
	for (const [date, kg] of weightByDate) {
		if (!byDay.has(date)) {
			byDay.set(date, {
				date,
				kcal: 0,
				entryCount: 0,
				proteinG: 0,
				carbsG: 0,
				fatG: 0,
				fiberG: 0,
				weightKg: kg,
				entries: []
			});
		}
	}

	const days = [...byDay.values()].sort((a, b) => (a.date < b.date ? 1 : -1));

	return {
		days,
		totalDaysLogged: days.filter((d) => d.entryCount > 0).length,
		targetKcal: data.profileRow?.targetKcal ?? 2000
	};
};
