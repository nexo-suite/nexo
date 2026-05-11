import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => ({
	app: url.searchParams.get('app') ?? 'this app'
});
