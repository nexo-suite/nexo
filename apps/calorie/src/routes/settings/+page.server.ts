import { fail } from '@sveltejs/kit';
import { withUser, profiles, entries as entriesTable, loadHubProfile } from '@nexo/db';
import { eq, sql, desc } from 'drizzle-orm';
import { logger } from '$lib/server/logger';
import { calculateTargets } from '$lib/calc';
import type { PageServerLoad, Actions } from './$types';
import type { MacroTier, Sex, Goal, ActivityLevel } from '$lib/types';

const LOGLINES = [
	'The Greek Yogurt Truther',
	'Espresso Scholar',
	'Friend of the Banana',
	'Sourdough Apologist',
	'Almond Enthusiast',
	'Spinach Pilgrim',
	'Chicken Breast Diplomat',
	'Brown Rice Loyalist',
	'Egg Apologist',
	'Avocado Apprentice',
	'Dark Chocolate Initiate'
];

function pickLogline(topFood: string | null): string {
	if (!topFood) return 'Quiet ledger keeper';
	const lower = topFood.toLowerCase();
	if (lower.includes('yogurt')) return 'The Greek Yogurt Truther';
	if (lower.includes('espresso') || lower.includes('coffee')) return 'Espresso Scholar';
	if (lower.includes('banana')) return 'Friend of the Banana';
	if (lower.includes('sourdough') || lower.includes('bread')) return 'Sourdough Apologist';
	if (lower.includes('almond')) return 'Almond Enthusiast';
	if (lower.includes('spinach')) return 'Spinach Pilgrim';
	if (lower.includes('chicken')) return 'Chicken Breast Diplomat';
	if (lower.includes('rice')) return 'Brown Rice Loyalist';
	if (lower.includes('egg')) return 'Egg Apologist';
	if (lower.includes('avocado')) return 'Avocado Apprentice';
	if (lower.includes('chocolate')) return 'Dark Chocolate Initiate';
	const idx = topFood.charCodeAt(0) % LOGLINES.length;
	return LOGLINES[idx];
}

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const [hubProfile, data] = await Promise.all([
		loadHubProfile(userId),
		withUser(userId, async (tx) => {
			const [profileRow] = await tx
				.select()
				.from(profiles)
				.where(eq(profiles.userId, userId))
				.limit(1);

			const topFoodRows = await tx
				.select({
					foodName: entriesTable.foodName,
					count: sql<number>`count(*)::int`
				})
				.from(entriesTable)
				.where(eq(entriesTable.userId, userId))
				.groupBy(entriesTable.foodName)
				.orderBy(desc(sql`count(*)`))
				.limit(1);

			return { profileRow, topFoodRows };
		})
	]);

	const tier: MacroTier = (data.profileRow?.tier as MacroTier) ?? 'basic';

	const profile = data.profileRow
		? {
				sex: (data.profileRow.sex as Sex) ?? 'other',
				age: data.profileRow.age ?? 30,
				heightCm: Number(data.profileRow.heightCm ?? 170),
				weightKg: Number(data.profileRow.weightKg ?? 70),
				targetWeightKg: data.profileRow.targetWeightKg
					? Number(data.profileRow.targetWeightKg)
					: null,
				activity: (data.profileRow.activity as ActivityLevel) ?? 3,
				goal: (data.profileRow.goal as Goal) ?? 'maintain',
				tier
			}
		: null;

	const targets =
		data.profileRow?.targetKcal && data.profileRow?.targetsCustom
			? {
					kcal: data.profileRow.targetKcal,
					protein_g: Number(data.profileRow.targetProteinG ?? 0),
					carbs_g: Number(data.profileRow.targetCarbsG ?? 0),
					fat_g: Number(data.profileRow.targetFatG ?? 0),
					fiber_g: data.profileRow.targetFiberG ? Number(data.profileRow.targetFiberG) : 32,
					sugar_g: data.profileRow.targetSugarG ? Number(data.profileRow.targetSugarG) : 45
				}
			: profile
				? calculateTargets(profile)
				: { kcal: 2000, protein_g: 140, carbs_g: 220, fat_g: 70, fiber_g: 30, sugar_g: 50 };

	return {
		hubProfile,
		profile,
		targets,
		tier,
		searchLocale: (data.profileRow?.searchLocale as 'en' | 'de' | 'tr' | null) ?? null,
		logline: pickLogline(data.topFoodRows[0]?.foodName ?? null),
		diagnostics: {
			userId,
			email: locals.user?.email ?? null,
			correlationId: locals.correlationId
		}
	};
};

function readProfileFromForm(form: FormData) {
	return {
		sex: (form.get('sex') as Sex) || 'other',
		age: Number(form.get('age') ?? 0),
		heightCm: Number(form.get('heightCm') ?? 0),
		weightKg: Number(form.get('weightKg') ?? 0),
		activity: (Number(form.get('activity') ?? 3) as ActivityLevel) || 3,
		goal: (form.get('goal') as Goal) || 'maintain',
		tier: (form.get('tier') as MacroTier) || 'basic'
	};
}

export const actions: Actions = {
	updateProfile: async ({ locals, request }) => {
		const userId = locals.user!.id;
		const form = await request.formData();
		const p = readProfileFromForm(form);
		try {
			await withUser(userId, (tx) =>
				tx
					.insert(profiles)
					.values({
						userId,
						sex: p.sex,
						age: p.age,
						heightCm: String(p.heightCm),
						weightKg: String(p.weightKg),
						activity: p.activity,
						goal: p.goal,
						tier: p.tier
					})
					.onConflictDoUpdate({
						target: profiles.userId,
						set: {
							sex: p.sex,
							age: p.age,
							heightCm: String(p.heightCm),
							weightKg: String(p.weightKg),
							activity: p.activity,
							goal: p.goal,
							tier: p.tier,
							updatedAt: new Date()
						}
					})
			);
			return { success: true };
		} catch (e) {
			logger.error('updateProfile failed', {
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'PROFILE_FAILED', correlationId: locals.correlationId });
		}
	},

	updateTargets: async ({ locals, request }) => {
		const userId = locals.user!.id;
		const form = await request.formData();
		const targetKcal = Number(form.get('targetKcal') ?? 0) || null;
		const targetProteinG = form.get('targetProteinG');
		const targetCarbsG = form.get('targetCarbsG');
		const targetFatG = form.get('targetFatG');
		const targetFiberG = form.get('targetFiberG');
		const targetSugarG = form.get('targetSugarG');
		try {
			await withUser(userId, (tx) =>
				tx
					.update(profiles)
					.set({
						targetKcal,
						targetProteinG: targetProteinG ? String(Number(targetProteinG)) : null,
						targetCarbsG: targetCarbsG ? String(Number(targetCarbsG)) : null,
						targetFatG: targetFatG ? String(Number(targetFatG)) : null,
						targetFiberG: targetFiberG ? String(Number(targetFiberG)) : null,
						targetSugarG: targetSugarG ? String(Number(targetSugarG)) : null,
						targetsCustom: true,
						updatedAt: new Date()
					})
					.where(eq(profiles.userId, userId))
			);
			return { success: true };
		} catch (e) {
			logger.error('updateTargets failed', {
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'TARGETS_FAILED', correlationId: locals.correlationId });
		}
	},

	setTier: async ({ locals, request }) => {
		const userId = locals.user!.id;
		const form = await request.formData();
		const tier = (form.get('tier') as MacroTier) || 'basic';
		try {
			await withUser(userId, (tx) =>
				tx.update(profiles).set({ tier, updatedAt: new Date() }).where(eq(profiles.userId, userId))
			);
			return { success: true };
		} catch (e) {
			logger.error('setTier failed', {
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'TIER_FAILED', correlationId: locals.correlationId });
		}
	},

	completeOnboarding: async ({ locals, request }) => {
		const userId = locals.user!.id;
		const form = await request.formData();
		const p = readProfileFromForm(form);
		const targetKcal = Number(form.get('targetKcal') ?? 0) || null;
		const targetProteinG = form.get('targetProteinG');
		const targetCarbsG = form.get('targetCarbsG');
		const targetFatG = form.get('targetFatG');
		const targetsCustom = form.get('targetsCustom') === 'true';

		try {
			await withUser(userId, (tx) =>
				tx
					.insert(profiles)
					.values({
						userId,
						sex: p.sex,
						age: p.age,
						heightCm: String(p.heightCm),
						weightKg: String(p.weightKg),
						activity: p.activity,
						goal: p.goal,
						tier: p.tier,
						targetKcal,
						targetProteinG: targetProteinG ? String(Number(targetProteinG)) : null,
						targetCarbsG: targetCarbsG ? String(Number(targetCarbsG)) : null,
						targetFatG: targetFatG ? String(Number(targetFatG)) : null,
						targetsCustom,
						onboardingCompletedAt: new Date()
					})
					.onConflictDoUpdate({
						target: profiles.userId,
						set: {
							sex: p.sex,
							age: p.age,
							heightCm: String(p.heightCm),
							weightKg: String(p.weightKg),
							activity: p.activity,
							goal: p.goal,
							tier: p.tier,
							targetKcal,
							targetProteinG: targetProteinG ? String(Number(targetProteinG)) : null,
							targetCarbsG: targetCarbsG ? String(Number(targetCarbsG)) : null,
							targetFatG: targetFatG ? String(Number(targetFatG)) : null,
							targetsCustom,
							onboardingCompletedAt: new Date(),
							updatedAt: new Date()
						}
					})
			);
			logger.info('onboarding completed', { userId, correlationId: locals.correlationId });
			return { success: true };
		} catch (e) {
			logger.error('completeOnboarding failed', {
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'ONBOARDING_FAILED', correlationId: locals.correlationId });
		}
	},

	resetOnboarding: async ({ locals }) => {
		const userId = locals.user!.id;
		try {
			await withUser(userId, (tx) =>
				tx
					.update(profiles)
					.set({ onboardingCompletedAt: null, updatedAt: new Date() })
					.where(eq(profiles.userId, userId))
			);
			return { success: true };
		} catch (e) {
			logger.error('resetOnboarding failed', {
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'RESET_FAILED', correlationId: locals.correlationId });
		}
	},

	updateGoalWeight: async ({ locals, request }) => {
		const userId = locals.user!.id;
		const form = await request.formData();
		const raw = form.get('targetWeightKg');
		const value = typeof raw === 'string' ? raw.trim() : '';

		let next: string | null;
		if (!value) {
			next = null;
		} else {
			const parsed = Number(value);
			if (!Number.isFinite(parsed) || parsed < 20 || parsed > 400) {
				return fail(400, { error: 'INVALID_TARGET_WEIGHT', correlationId: locals.correlationId });
			}
			next = parsed.toFixed(1);
		}

		try {
			await withUser(userId, (tx) =>
				tx
					.update(profiles)
					.set({ targetWeightKg: next, updatedAt: new Date() })
					.where(eq(profiles.userId, userId))
			);
			return { success: true };
		} catch (e) {
			logger.error('updateGoalWeight failed', {
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'GOAL_WEIGHT_FAILED', correlationId: locals.correlationId });
		}
	},

	updateSearchLocale: async ({ locals, request }) => {
		const userId = locals.user!.id;
		const form = await request.formData();
		const raw = form.get('searchLocale');
		// 'auto' (or empty) → store NULL = follow UI; 'en'|'de'|'tr' → concrete override.
		const next: string | null =
			raw === 'en' || raw === 'de' || raw === 'tr' ? raw : raw === 'auto' || !raw ? null : null;

		try {
			await withUser(userId, (tx) =>
				tx
					.insert(profiles)
					.values({ userId, searchLocale: next })
					.onConflictDoUpdate({
						target: profiles.userId,
						set: { searchLocale: next, updatedAt: new Date() }
					})
			);
			return { success: true };
		} catch (e) {
			logger.error('updateSearchLocale failed', {
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'SEARCH_LOCALE_FAILED', correlationId: locals.correlationId });
		}
	}
};
