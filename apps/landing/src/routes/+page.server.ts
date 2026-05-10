import { env } from '$env/dynamic/public';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return {
		versions: {
			finance: env.PUBLIC_APP_VERSION ?? '0.0.0'
		}
	};
};
