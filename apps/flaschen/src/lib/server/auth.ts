import { createGetAuth } from '@nexo/security';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export const getAuth = createGetAuth(() => ({
	secret: env.BETTER_AUTH_SECRET,
	baseURL: publicEnv.PUBLIC_AUTH_URL
}));
