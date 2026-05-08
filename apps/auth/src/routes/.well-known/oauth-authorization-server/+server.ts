import { oauthProviderAuthServerMetadata } from '@better-auth/oauth-provider';
import { getAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = (event) => oauthProviderAuthServerMetadata(getAuth())(event);
