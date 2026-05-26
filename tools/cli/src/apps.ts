export type App = {
	name: string;
	dir: string;
	pkg: string;
	image: string;
	// 'deploy' = `pnpm --prod deploy` produces context with package.json +
	// node_modules + build/. Used by SvelteKit apps where adapter-node
	// externalizes runtime deps.
	// 'bundle' = tsdown bundles all deps inline, context is just dist/.
	// Skips the pnpm deploy step entirely.
	strategy: 'deploy' | 'bundle';
};

export const APPS: readonly App[] = [
	{ name: 'auth', dir: 'apps/auth', pkg: '@nexo/auth', image: 'nexo-auth', strategy: 'deploy' },
	{ name: 'admin', dir: 'apps/admin', pkg: '@nexo/admin', image: 'nexo-admin', strategy: 'deploy' },
	{
		name: 'finance',
		dir: 'apps/finance',
		pkg: '@nexo/finance',
		image: 'nexo-finance',
		strategy: 'deploy'
	},
	{
		name: 'flaschen',
		dir: 'apps/flaschen',
		pkg: '@nexo/flaschen',
		image: 'nexo-flaschen',
		strategy: 'deploy'
	},
	{
		name: 'calorie',
		dir: 'apps/calorie',
		pkg: '@nexo/calorie',
		image: 'nexo-calorie',
		strategy: 'deploy'
	},
	{
		name: 'landing',
		dir: 'apps/landing',
		pkg: '@nexo/landing',
		image: 'nexo-landing',
		strategy: 'deploy'
	},
	{ name: 'bot', dir: 'apps/bot', pkg: '@nexo/bot', image: 'nexo-bot', strategy: 'bundle' },
	{ name: 'db', dir: 'packages/db', pkg: '@nexo/db', image: 'nexo-db', strategy: 'bundle' }
] as const;

const REGISTRY = 'ghcr.io/nexo-suite';

export function imageRef(app: App, tag: string): string {
	return `${REGISTRY}/${app.image}:${tag}`;
}

export function findApp(name: string): App {
	const app = APPS.find((a) => a.name === name);
	if (!app) {
		const known = APPS.map((a) => a.name).join(', ');
		throw new Error(`Unknown app "${name}". Known: ${known}`);
	}
	return app;
}
