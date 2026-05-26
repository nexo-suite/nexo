import { json, error } from '@sveltejs/kit';
import { lookupBarcode, type Locale } from '$lib/server/off';
import { logger } from '$lib/server/logger';
import { getLocale } from '$lib/paraglide/runtime.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const userId = locals.user!.id;
	const barcode = url.searchParams.get('barcode')?.trim() ?? '';
	const locale = getLocale() as Locale;

	if (!/^\d{8,14}$/.test(barcode)) {
		throw error(400, 'INVALID_BARCODE');
	}

	try {
		const food = await lookupBarcode(userId, barcode, locale);
		if (!food) return json({ source: 'off', food: null }, { status: 404 });
		return json({ source: food.source, food });
	} catch (e) {
		logger.warn('scan_failed', {
			barcode,
			error: String(e),
			correlationId: locals.correlationId
		});
		throw error(502, 'OFF_UNAVAILABLE');
	}
};
