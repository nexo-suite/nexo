import { env } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';

const appMeta = {
	version: env.APP_VERSION ?? __APP_VERSION_FALLBACK__,
	commit: env.APP_COMMIT ?? env.GIT_COMMIT ?? __APP_COMMIT_FALLBACK__,
	buildTime: env.APP_BUILD_TIME ?? env.BUILD_TIME ?? __APP_BUILD_TIME_FALLBACK__
};

export const load: LayoutServerLoad = () => ({ appMeta });
