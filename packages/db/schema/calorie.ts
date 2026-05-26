import {
	pgSchema,
	uuid,
	text,
	numeric,
	integer,
	boolean,
	timestamp,
	date,
	jsonb,
	index,
	primaryKey
} from 'drizzle-orm/pg-core';
import { users } from './auth.js';

export const calorieSchema = pgSchema('calorie');

// Per-user profile + targets. PK = userId (one row per user, lives only after onboarding).
// onboardingCompletedAt drives the layout-level gate that mounts the inline wizard.
export const profiles = calorieSchema.table('profiles', {
	userId: text('user_id')
		.primaryKey()
		.references(() => users.id, { onDelete: 'cascade' }),
	sex: text('sex'),
	age: integer('age'),
	heightCm: numeric('height_cm', { precision: 5, scale: 1 }),
	weightKg: numeric('weight_kg', { precision: 5, scale: 2 }),
	activity: integer('activity'),
	goal: text('goal'),
	tier: text('tier').notNull().default('basic'),
	targetKcal: integer('target_kcal'),
	targetProteinG: numeric('target_protein_g', { precision: 6, scale: 1 }),
	targetCarbsG: numeric('target_carbs_g', { precision: 6, scale: 1 }),
	targetFatG: numeric('target_fat_g', { precision: 6, scale: 1 }),
	targetFiberG: numeric('target_fiber_g', { precision: 6, scale: 1 }),
	targetSugarG: numeric('target_sugar_g', { precision: 6, scale: 1 }),
	targetsCustom: boolean('targets_custom').notNull().default(false),
	onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Shared barcode cache. Only populated by Open Food Facts lookups, never per-user data.
// No cross-user bleed: users only see a row when they themselves scan that barcode.
export const foodsCache = calorieSchema.table('foods_cache', {
	barcode: text('barcode').primaryKey(),
	nameDe: text('name_de'),
	nameTr: text('name_tr'),
	nameEn: text('name_en'),
	nameGeneric: text('name_generic'),
	brand: text('brand'),
	kcal100g: numeric('kcal_100g', { precision: 7, scale: 2 }),
	protein100g: numeric('protein_100g', { precision: 6, scale: 2 }),
	carbs100g: numeric('carbs_100g', { precision: 6, scale: 2 }),
	fat100g: numeric('fat_100g', { precision: 6, scale: 2 }),
	fiber100g: numeric('fiber_100g', { precision: 6, scale: 2 }),
	sugars100g: numeric('sugars_100g', { precision: 6, scale: 2 }),
	saturatedFat100g: numeric('saturated_fat_100g', { precision: 6, scale: 2 }),
	salt100g: numeric('salt_100g', { precision: 6, scale: 2 }),
	servingSizeG: numeric('serving_size_g', { precision: 7, scale: 2 }),
	imageUrl: text('image_url'),
	rawOff: jsonb('raw_off').$type<Record<string, unknown>>(),
	fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
	lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }).notNull().defaultNow()
});

// Per-user custom foods (manually entered, or saved from a scan with edits).
export const userFoods = calorieSchema.table(
	'user_foods',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		brand: text('brand'),
		kcal100g: numeric('kcal_100g', { precision: 7, scale: 2 }).notNull(),
		protein100g: numeric('protein_100g', { precision: 6, scale: 2 }).notNull().default('0'),
		carbs100g: numeric('carbs_100g', { precision: 6, scale: 2 }).notNull().default('0'),
		fat100g: numeric('fat_100g', { precision: 6, scale: 2 }).notNull().default('0'),
		fiber100g: numeric('fiber_100g', { precision: 6, scale: 2 }),
		sugars100g: numeric('sugars_100g', { precision: 6, scale: 2 }),
		units: jsonb('units')
			.$type<Array<{ id: string; gramsPerUnit: number; label?: string; default?: boolean }>>()
			.notNull()
			.default([]),
		sourceBarcode: text('source_barcode'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('user_foods_user_id_idx').on(t.userId)]
);

// Per-user food log. Macros are denormalized at log time so historical entries stay
// stable even if the source food (cache or custom) is later edited or removed.
// foodBarcode XOR foodUserId — exactly one is set, depending on the source.
export const entries = calorieSchema.table(
	'entries',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		foodBarcode: text('food_barcode'),
		foodUserId: uuid('food_user_id').references(() => userFoods.id, { onDelete: 'set null' }),
		foodName: text('food_name').notNull(),
		grams: numeric('grams', { precision: 7, scale: 1 }).notNull(),
		unit: text('unit').notNull().default('g'),
		kcal: numeric('kcal', { precision: 7, scale: 1 }).notNull(),
		proteinG: numeric('protein_g', { precision: 6, scale: 1 }).notNull().default('0'),
		carbsG: numeric('carbs_g', { precision: 6, scale: 1 }).notNull().default('0'),
		fatG: numeric('fat_g', { precision: 6, scale: 1 }).notNull().default('0'),
		fiberG: numeric('fiber_g', { precision: 6, scale: 1 }),
		sugarG: numeric('sugar_g', { precision: 6, scale: 1 }),
		mealSlot: text('meal_slot'),
		mealId: uuid('meal_id'),
		loggedAt: timestamp('logged_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('entries_user_logged_idx').on(t.userId, t.loggedAt),
		index('entries_user_meal_idx').on(t.userId, t.mealId)
	]
);

// Saved meal templates ("Typical lunch", "Eggs & sourdough"...).
export const mealTemplates = calorieSchema.table(
	'meal_templates',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		mealSlot: text('meal_slot'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('meal_templates_user_id_idx').on(t.userId)]
);

export const mealTemplateItems = calorieSchema.table(
	'meal_template_items',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		templateId: uuid('template_id')
			.notNull()
			.references(() => mealTemplates.id, { onDelete: 'cascade' }),
		foodBarcode: text('food_barcode'),
		foodUserId: uuid('food_user_id').references(() => userFoods.id, { onDelete: 'cascade' }),
		foodName: text('food_name').notNull(),
		grams: numeric('grams', { precision: 7, scale: 1 }).notNull(),
		unit: text('unit').notNull().default('g'),
		position: integer('position').notNull().default(0)
	},
	(t) => [index('meal_template_items_template_id_idx').on(t.templateId)]
);

export const userFavorites = calorieSchema.table(
	'user_favorites',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		foodBarcode: text('food_barcode'),
		foodUserId: uuid('food_user_id').references(() => userFoods.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [index('user_favorites_user_id_idx').on(t.userId)]
);

// One row per (user, day). Composite PK prevents duplicate weight entries for the same date.
export const weightLogs = calorieSchema.table(
	'weight_logs',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		date: date('date').notNull(),
		kg: numeric('kg', { precision: 5, scale: 2 }).notNull(),
		loggedAt: timestamp('logged_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.userId, t.date] })]
);

// Shared cache of OFF free-text search results. Key is (normalized query, locale).
// Stores barcode array; the actual product data still lives in foods_cache.
// 30-day TTL is enforced in the search endpoint, not via DB-side expiry.
export const foodsSearchCache = calorieSchema.table(
	'foods_search_cache',
	{
		queryNormalized: text('query_normalized').notNull(),
		locale: text('locale').notNull(),
		barcodes: text('barcodes').array().notNull(),
		fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.queryNormalized, t.locale] })]
);

export type CalorieProfile = typeof profiles.$inferSelect;
export type CalorieFoodCache = typeof foodsCache.$inferSelect;
export type CalorieUserFood = typeof userFoods.$inferSelect;
export type CalorieEntry = typeof entries.$inferSelect;
export type CalorieMealTemplate = typeof mealTemplates.$inferSelect;
export type CalorieMealTemplateItem = typeof mealTemplateItems.$inferSelect;
export type CalorieUserFavorite = typeof userFavorites.$inferSelect;
export type CalorieWeightLog = typeof weightLogs.$inferSelect;
export type CalorieFoodsSearchCache = typeof foodsSearchCache.$inferSelect;
