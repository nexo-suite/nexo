import { json } from '@sveltejs/kit';

export const prerender = false;

export const GET = () => json({ ok: true, version: __APP_VERSION__, checks: {}, latency_ms: 0 });
