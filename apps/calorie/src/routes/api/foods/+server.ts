import { json, error } from '@sveltejs/kit';
import { withUser, userFoods } from '@nexo/db';
import { logger } from '$lib/server/logger';
import type { RequestHandler } from './$types';

/**
 * POST /api/foods — create a per-user custom food.
 *
 * Accepts { name, kcal100g, protein100g?, carbs100g?, fat100g?, fiber100g?, sugars100g?, brand? }.
 * Returns the row shaped as a search result with source: 'user'. Caller can
 * immediately log a portion of the new food.
 *
 * Per-user; never visible to other users. We do not validate beyond minimum
 * sanity (kcal 0–1000, name length) — these foods only ever land in the user's
 * own log, so bad inputs only hurt the user who entered them.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const userId = locals.user!.id;
	let body: Record<string, unknown>;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'BAD_PAYLOAD');
	}

	const name = typeof body.name === 'string' ? body.name.trim() : '';
	if (name.length < 1 || name.length > 80) throw error(400, 'INVALID_NAME');

	const kcal = num(body.kcal100g);
	if (kcal == null || kcal < 0 || kcal > 1000) throw error(400, 'INVALID_KCAL');

	const protein = num(body.protein100g) ?? 0;
	const carbs = num(body.carbs100g) ?? 0;
	const fat = num(body.fat100g) ?? 0;
	const fiber = num(body.fiber100g);
	const sugars = num(body.sugars100g);
	const brand = typeof body.brand === 'string' && body.brand.trim() ? body.brand.trim() : null;

	try {
		const [row] = await withUser(userId, (tx) =>
			tx
				.insert(userFoods)
				.values({
					userId,
					name,
					brand,
					kcal100g: String(kcal),
					protein100g: String(protein),
					carbs100g: String(carbs),
					fat100g: String(fat),
					fiber100g: fiber != null ? String(fiber) : null,
					sugars100g: sugars != null ? String(sugars) : null
				})
				.returning()
		);
		return json({
			id: row!.id,
			source: 'user',
			name: row!.name,
			brand: row!.brand,
			kcal100g: Number(row!.kcal100g),
			protein100g: Number(row!.protein100g),
			carbs100g: Number(row!.carbs100g),
			fat100g: Number(row!.fat100g),
			fiber100g: row!.fiber100g != null ? Number(row!.fiber100g) : null,
			sugars100g: row!.sugars100g != null ? Number(row!.sugars100g) : null,
			nutriScoreGrade: null,
			servingSizeG: null
		});
	} catch (e) {
		logger.error('createFood failed', {
			error: String(e),
			correlationId: locals.correlationId
		});
		throw error(500, 'CREATE_FAILED');
	}
};

function num(v: unknown): number | null {
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	if (typeof v === 'string' && v.trim() !== '') {
		const n = Number(v);
		return Number.isFinite(n) ? n : null;
	}
	return null;
}
