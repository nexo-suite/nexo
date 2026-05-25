export type App = {
	name: string;
	dir: string;
	pkg: string;
	image: string;
};

export const APPS: readonly App[] = [
	{ name: 'auth', dir: 'apps/auth', pkg: '@nexo/auth', image: 'nexo-auth' },
	{ name: 'admin', dir: 'apps/admin', pkg: '@nexo/admin', image: 'nexo-admin' },
	{ name: 'finance', dir: 'apps/finance', pkg: '@nexo/finance', image: 'nexo-finance' },
	{ name: 'flaschen', dir: 'apps/flaschen', pkg: '@nexo/flaschen', image: 'nexo-flaschen' },
	{ name: 'calorie', dir: 'apps/calorie', pkg: '@nexo/calorie', image: 'nexo-calorie' },
	{ name: 'landing', dir: 'apps/landing', pkg: '@nexo/landing', image: 'nexo-landing' },
	{ name: 'bot', dir: 'apps/bot', pkg: '@nexo/bot', image: 'nexo-bot' },
	{ name: 'db', dir: 'packages/db', pkg: '@nexo/db', image: 'nexo-db' }
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
