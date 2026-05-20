import { json } from '@sveltejs/kit';
import { db } from '@nexo/db';
import { sql } from 'drizzle-orm';

export const prerender = false;

type Check = { ok: boolean; latency_ms?: number; error?: string };

export const GET = async () => {
	const start = Date.now();
	const checks: Record<string, Check> = {};

	const t0 = Date.now();
	try {
		await db.execute(sql`SELECT 1`);
		checks.db = { ok: true, latency_ms: Date.now() - t0 };
	} catch (e) {
		checks.db = { ok: false, latency_ms: Date.now() - t0, error: String(e) };
	}

	const allOk = Object.values(checks).every((c) => c.ok);
	return json(
		{ ok: allOk, version: __APP_VERSION__, checks, latency_ms: Date.now() - start },
		{ status: allOk ? 200 : 503 }
	);
};
