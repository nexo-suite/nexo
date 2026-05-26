import { fail } from '@sveltejs/kit';
import {
	withUser,
	profiles,
	entries as entriesTable,
	userFoods,
	foodsCache,
	mealTemplates,
	mealTemplateItems,
	userFavorites
} from '@nexo/db';
import { and, eq, gte, lt, desc, inArray } from 'drizzle-orm';
import { logger } from '$lib/server/logger';
import { calculateTargets } from '$lib/calc';
import { pickName, type Locale } from '$lib/server/off';
import { getLocale } from '$lib/paraglide/runtime.js';
import type { PageServerLoad, Actions } from './$types';
import type { MacroTier, MealSlot, Sex, Goal, ActivityLevel } from '$lib/types';

function dayBounds(d: Date) {
	const start = new Date(d);
	start.setHours(0, 0, 0, 0);
	const end = new Date(start);
	end.setDate(end.getDate() + 1);
	return { start, end };
}

function defaultTier(): MacroTier {
	return 'basic';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;
	const locale = getLocale() as Locale;
	const dateParam = url.searchParams.get('date');
	const targetDay = dateParam ? new Date(dateParam) : new Date();
	const { start, end } = dayBounds(targetDay);

	const data = await withUser(userId, async (tx) => {
		const [profileRow] = await tx
			.select()
			.from(profiles)
			.where(eq(profiles.userId, userId))
			.limit(1);

		const todayRows = await tx
			.select()
			.from(entriesTable)
			.where(
				and(
					eq(entriesTable.userId, userId),
					gte(entriesTable.loggedAt, start),
					lt(entriesTable.loggedAt, end)
				)
			)
			.orderBy(entriesTable.loggedAt);

		// Recent distinct foods from the user's last 60 entries — drives "Recents" tab
		const recentRows = await tx
			.select()
			.from(entriesTable)
			.where(eq(entriesTable.userId, userId))
			.orderBy(desc(entriesTable.loggedAt))
			.limit(60);

		const ownFoods = await tx
			.select()
			.from(userFoods)
			.where(eq(userFoods.userId, userId))
			.orderBy(desc(userFoods.createdAt));

		const favorites = await tx.select().from(userFavorites).where(eq(userFavorites.userId, userId));

		const templates = await tx
			.select()
			.from(mealTemplates)
			.where(eq(mealTemplates.userId, userId))
			.orderBy(desc(mealTemplates.createdAt));

		// Cached barcoded foods this user has interacted with (recents or favorites)
		const seenBarcodes = new Set<string>();
		for (const r of recentRows) if (r.foodBarcode) seenBarcodes.add(r.foodBarcode);
		for (const f of favorites) if (f.foodBarcode) seenBarcodes.add(f.foodBarcode);
		const cacheRows = seenBarcodes.size
			? await tx
					.select()
					.from(foodsCache)
					.where(inArray(foodsCache.barcode, Array.from(seenBarcodes)))
			: [];

		return { profileRow, todayRows, recentRows, ownFoods, favorites, templates, cacheRows };
	});

	const tier: MacroTier = (data.profileRow?.tier as MacroTier) ?? defaultTier();

	// Targets — either custom or computed from body stats; sensible default if not onboarded
	let targets;
	if (data.profileRow?.targetKcal && data.profileRow?.targetsCustom) {
		targets = {
			kcal: data.profileRow.targetKcal,
			protein_g: Number(data.profileRow.targetProteinG ?? 0),
			carbs_g: Number(data.profileRow.targetCarbsG ?? 0),
			fat_g: Number(data.profileRow.targetFatG ?? 0),
			fiber_g: data.profileRow.targetFiberG ? Number(data.profileRow.targetFiberG) : 32,
			sugar_g: data.profileRow.targetSugarG ? Number(data.profileRow.targetSugarG) : 45
		};
	} else if (data.profileRow?.age && data.profileRow?.heightCm && data.profileRow?.weightKg) {
		targets = calculateTargets({
			sex: (data.profileRow.sex as Sex) ?? 'other',
			age: data.profileRow.age,
			heightCm: Number(data.profileRow.heightCm),
			weightKg: Number(data.profileRow.weightKg),
			activity: (data.profileRow.activity as ActivityLevel) ?? 3,
			goal: (data.profileRow.goal as Goal) ?? 'maintain',
			tier
		});
	} else {
		targets = { kcal: 2000, protein_g: 140, carbs_g: 220, fat_g: 70, fiber_g: 30, sugar_g: 50 };
	}

	const profile = {
		sex: (data.profileRow?.sex as Sex) ?? 'other',
		age: data.profileRow?.age ?? 30,
		heightCm: Number(data.profileRow?.heightCm ?? 170),
		weightKg: Number(data.profileRow?.weightKg ?? 70),
		activity: (data.profileRow?.activity as ActivityLevel) ?? 3,
		goal: (data.profileRow?.goal as Goal) ?? 'maintain',
		tier
	};

	const todayEntries = data.todayRows.map((e) => ({
		id: e.id,
		foodId: e.foodBarcode ?? e.foodUserId ?? e.id,
		foodName: e.foodName,
		grams: Number(e.grams),
		kcal: Number(e.kcal),
		protein_g: Number(e.proteinG),
		carbs_g: Number(e.carbsG),
		fat_g: Number(e.fatG),
		fiber_g: e.fiberG ? Number(e.fiberG) : undefined,
		mealSlot: (e.mealSlot ?? undefined) as MealSlot | undefined,
		mealId: e.mealId ?? undefined,
		loggedAt: e.loggedAt.toISOString()
	}));

	return {
		profile,
		targets,
		todayEntries,
		// Foods catalog assembled for AddEntrySheet — only the user's own data, no cross-user bleed
		foods: assembleFoodsCatalog(data.ownFoods, data.cacheRows, locale),
		recentFoodIds: deriveRecents(data.recentRows),
		favoriteIds: deriveFavoriteIds(data.favorites),
		savedMeals: data.templates.map((t) => ({
			id: t.id,
			name: t.name,
			mealSlot: (t.mealSlot ?? undefined) as MealSlot | undefined,
			items: [],
			saved: true
		})),
		todayMoments: deriveMoments(todayEntries)
	};
};

function assembleFoodsCatalog(
	own: Array<typeof userFoods.$inferSelect>,
	cached: Array<typeof foodsCache.$inferSelect>,
	locale: Locale
) {
	const fromOwn = own.map((f) => ({
		id: f.id,
		name: f.name,
		brand: f.brand ?? undefined,
		per100: {
			kcal: Number(f.kcal100g),
			protein_g: Number(f.protein100g),
			carbs_g: Number(f.carbs100g),
			fat_g: Number(f.fat100g),
			fiber_g: f.fiber100g ? Number(f.fiber100g) : undefined,
			sugar_g: f.sugars100g ? Number(f.sugars100g) : undefined
		},
		units: (f.units ?? []) as Array<{
			id: string;
			gramsPerUnit: number;
			label?: string;
			default?: boolean;
		}>
	}));
	const fromCache = cached.map((c) => ({
		id: c.barcode,
		name: pickName(c, locale),
		brand: c.brand ?? undefined,
		per100: {
			kcal: c.kcal100g ? Number(c.kcal100g) : 0,
			protein_g: c.protein100g ? Number(c.protein100g) : 0,
			carbs_g: c.carbs100g ? Number(c.carbs100g) : 0,
			fat_g: c.fat100g ? Number(c.fat100g) : 0,
			fiber_g: c.fiber100g ? Number(c.fiber100g) : undefined,
			sugar_g: c.sugars100g ? Number(c.sugars100g) : undefined
		}
	}));
	return [...fromOwn, ...fromCache];
}

function deriveRecents(rows: Array<typeof entriesTable.$inferSelect>): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const r of rows) {
		const key = r.foodBarcode ?? r.foodUserId;
		if (!key || seen.has(key)) continue;
		seen.add(key);
		out.push(key);
		if (out.length >= 12) break;
	}
	return out;
}

function deriveFavoriteIds(rows: Array<typeof userFavorites.$inferSelect>): string[] {
	return rows.map((f) => f.foodBarcode ?? f.foodUserId ?? '').filter(Boolean);
}

function deriveMoments(today: Array<{ loggedAt: string; foodName: string }>) {
	const moments: Array<{
		id: string;
		kind: 'first_of_day' | 'welcome_back' | 'new_friend' | 'variety' | 'family_table';
		headline: string;
		body?: string;
		at?: string;
	}> = [];
	if (today.length === 0) {
		moments.push({
			id: 'first',
			kind: 'first_of_day',
			headline: 'A clean ledger',
			body: 'Add your first entry whenever you’re ready.'
		});
	}
	return moments;
}

export const actions: Actions = {
	logEntry: async ({ locals, request }) => {
		const userId = locals.user!.id;
		const form = await request.formData();
		const itemsJson = form.get('items') as string | null;
		const mealSlot = (form.get('mealSlot') as MealSlot) || null;
		const templateName = (form.get('templateName') as string) || null;

		if (!itemsJson) {
			return fail(400, { error: 'NO_ITEMS', correlationId: locals.correlationId });
		}

		let items: Array<{
			foodBarcode?: string | null;
			foodUserId?: string | null;
			foodName: string;
			grams: number;
			unit?: string;
			kcal: number;
			proteinG: number;
			carbsG: number;
			fatG: number;
			fiberG?: number;
			sugarG?: number;
		}>;
		try {
			items = JSON.parse(itemsJson);
		} catch {
			return fail(400, { error: 'BAD_PAYLOAD', correlationId: locals.correlationId });
		}

		if (!Array.isArray(items) || items.length === 0) {
			return fail(400, { error: 'NO_ITEMS', correlationId: locals.correlationId });
		}

		const mealId = items.length > 1 ? crypto.randomUUID() : null;

		try {
			await withUser(userId, async (tx) => {
				for (const it of items) {
					await tx.insert(entriesTable).values({
						userId,
						foodBarcode: it.foodBarcode ?? null,
						foodUserId: it.foodUserId ?? null,
						foodName: it.foodName,
						grams: String(it.grams),
						unit: it.unit ?? 'g',
						kcal: String(it.kcal),
						proteinG: String(it.proteinG),
						carbsG: String(it.carbsG),
						fatG: String(it.fatG),
						fiberG: it.fiberG != null ? String(it.fiberG) : null,
						sugarG: it.sugarG != null ? String(it.sugarG) : null,
						mealSlot,
						mealId
					});
				}
				if (templateName && items.length > 1) {
					const [tpl] = await tx
						.insert(mealTemplates)
						.values({ userId, name: templateName, mealSlot })
						.returning({ id: mealTemplates.id });
					if (tpl) {
						await tx.insert(mealTemplateItems).values(
							items.map((it, i) => ({
								templateId: tpl.id,
								foodBarcode: it.foodBarcode ?? null,
								foodUserId: it.foodUserId ?? null,
								foodName: it.foodName,
								grams: String(it.grams),
								unit: it.unit ?? 'g',
								position: i
							}))
						);
					}
				}
			});
			logger.info('logged entry', {
				userId,
				count: items.length,
				correlationId: locals.correlationId
			});
			return { success: true };
		} catch (e) {
			logger.error('logEntry failed', {
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'LOG_FAILED', correlationId: locals.correlationId });
		}
	},

	editEntry: async ({ locals, request }) => {
		const userId = locals.user!.id;
		const form = await request.formData();
		const id = form.get('id') as string;
		const grams = Number(form.get('grams') ?? 0);
		const kcal = Number(form.get('kcal') ?? 0);
		const proteinG = Number(form.get('proteinG') ?? 0);
		const carbsG = Number(form.get('carbsG') ?? 0);
		const fatG = Number(form.get('fatG') ?? 0);
		const unit = (form.get('unit') as string) || 'g';
		const mealSlot = (form.get('mealSlot') as MealSlot) || null;

		if (!id) return fail(400, { error: 'MISSING_ID', correlationId: locals.correlationId });

		try {
			await withUser(userId, async (tx) => {
				await tx
					.update(entriesTable)
					.set({
						grams: String(grams),
						kcal: String(kcal),
						proteinG: String(proteinG),
						carbsG: String(carbsG),
						fatG: String(fatG),
						unit,
						mealSlot
					})
					.where(and(eq(entriesTable.id, id), eq(entriesTable.userId, userId)));
			});
			return { success: true };
		} catch (e) {
			logger.error('editEntry failed', {
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'EDIT_FAILED', correlationId: locals.correlationId });
		}
	},

	deleteEntry: async ({ locals, request }) => {
		const userId = locals.user!.id;
		const form = await request.formData();
		const id = form.get('id') as string;
		if (!id) return fail(400, { error: 'MISSING_ID', correlationId: locals.correlationId });

		try {
			await withUser(userId, (tx) =>
				tx.delete(entriesTable).where(and(eq(entriesTable.id, id), eq(entriesTable.userId, userId)))
			);
			return { success: true };
		} catch (e) {
			logger.error('deleteEntry failed', {
				error: String(e),
				correlationId: locals.correlationId
			});
			return fail(500, { error: 'DELETE_FAILED', correlationId: locals.correlationId });
		}
	}
};
