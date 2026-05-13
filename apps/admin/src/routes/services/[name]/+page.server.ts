import { dockerGet } from '$lib/server/docker';
import type { ContainerInspect } from '$lib/server/docker';
import { error } from '@sveltejs/kit';
import { logger } from '$lib/server/logger';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const container = await dockerGet<ContainerInspect>(
		`/containers/${encodeURIComponent(params.name)}/json`
	).catch((e) => {
		logger.error('docker inspect failed', { name: params.name, error: String(e) });
		return null;
	});

	if (!container) error(404, `Container "${params.name}" not found`);

	return { container };
};
