import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const prerender = false;

const VERSION = env.APP_VERSION ?? __APP_VERSION_FALLBACK__;
const COMMIT = env.APP_COMMIT ?? env.GIT_COMMIT ?? __APP_COMMIT_FALLBACK__;
const BUILD_TIME = env.APP_BUILD_TIME ?? env.BUILD_TIME ?? __APP_BUILD_TIME_FALLBACK__;

export const GET = () =>
	json({
		ok: true,
		version: VERSION,
		commit: COMMIT,
		buildTime: BUILD_TIME,
		checks: {},
		latency_ms: 0
	});
