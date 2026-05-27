export type MacroTier = 'basic' | 'extended' | 'full';

export type Sex = 'female' | 'male' | 'other';
export type Goal = 'cut' | 'maintain' | 'bulk';
export type ActivityLevel = 1 | 2 | 3 | 4 | 5; // sedentary → very active

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Profile {
	sex: Sex;
	age: number;
	heightCm: number;
	weightKg: number;
	activity: ActivityLevel;
	goal: Goal;
	tier: MacroTier;
}

export interface Targets {
	kcal: number;
	protein_g: number;
	carbs_g: number;
	fat_g: number;
	fiber_g?: number;
	sugar_g?: number;
	satfat_g?: number;
	sodium_mg?: number;
}

export interface Food {
	id: string;
	name: string;
	brand?: string;
	per100: {
		kcal: number;
		protein_g: number;
		carbs_g: number;
		fat_g: number;
		fiber_g?: number;
		sugar_g?: number;
		satfat_g?: number;
		sodium_mg?: number;
	};
	/** Optional: alternative units the food can be logged in (besides grams). */
	units?: FoodUnit[];
}

/** A unit of measurement for a food, with its conversion factor to grams. */
export type UnitId = 'g' | 'ml' | 'tsp' | 'tbsp' | 'cup' | 'piece' | 'shot';

export interface FoodUnit {
	id: UnitId;
	/** How many grams 1 of this unit is. e.g. 1 tbsp = ~13g for olive oil. */
	gramsPerUnit: number;
	/** Display label override (defaults to the unit id). */
	label?: string;
	/** Default unit for this food — picked when the entry is first added. */
	default?: boolean;
}

/** A small inline observation surfaced in the Today timeline. Always positive, never restrictive. */
export interface Moment {
	id: string;
	kind: 'first_of_day' | 'welcome_back' | 'new_friend' | 'variety' | 'family_table';
	/** Plain headline shown to the user. */
	headline: string;
	/** Optional supporting line. */
	body?: string;
	/** Where in the day to slot the moment — same hour key as the surrounding entries. */
	at?: string; // ISO timestamp
}

export interface Entry {
	id: string;
	foodId: string;
	foodName: string;
	grams: number;
	kcal: number;
	protein_g: number;
	carbs_g: number;
	fat_g: number;
	fiber_g?: number;
	mealSlot?: MealSlot;
	/** Groups multiple entries logged together as one meal. */
	mealId?: string;
	loggedAt: string; // ISO
}

interface MealItem {
	foodId: string;
	grams: number;
}

/** A composite meal: either an in-flight stack while building, or a saved template for re-logging. */
export interface Meal {
	id: string;
	name?: string;
	mealSlot?: MealSlot;
	items: MealItem[];
	/** True when this is a reusable template, not tied to a specific log. */
	saved?: boolean;
}

export interface DaySummary {
	date: string;
	kcal: number;
	target: number;
}

/** A single logged food entry, denormalized for history display. */
interface HistoryEntry {
	id: string;
	loggedAt: string;
	foodName: string;
	grams: number;
	unit: string;
	kcal: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
	fiberG: number | null;
	sugarG: number | null;
	mealSlot: string | null;
}

/** Aggregated per-day record for the history archive. */
export interface HistoryDay {
	date: string;
	kcal: number;
	entryCount: number;
	proteinG: number;
	carbsG: number;
	fatG: number;
	fiberG: number;
	weightKg: number | null;
	entries: HistoryEntry[];
}
