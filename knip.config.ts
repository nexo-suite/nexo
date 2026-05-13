import type { KnipConfig } from 'knip';

const SVELTE_ENTRY = ['src/routes/**/+*.{ts,js,svelte}'];
const SVELTE_PROJECT = ['src/**/*.{ts,js,svelte}'];

const config: KnipConfig = {
	workspaces: {
		'.': {},
		'apps/landing': {
			entry: SVELTE_ENTRY,
			project: SVELTE_PROJECT,
			ignoreDependencies: ['tailwindcss']
		},
		'apps/auth': {
			entry: SVELTE_ENTRY,
			project: SVELTE_PROJECT,
			ignoreDependencies: ['tailwindcss']
		},
		'apps/admin': {
			entry: SVELTE_ENTRY,
			project: SVELTE_PROJECT,
			ignoreDependencies: ['tailwindcss']
		},
		'apps/finance': {
			entry: SVELTE_ENTRY,
			project: SVELTE_PROJECT,
			ignore: ['src/lib/components/ui/**', 'src/lib/index.ts', 'src/lib/utils.ts'],
			ignoreDependencies: ['@fontsource-variable/inter']
		},
		'apps/bot': {
			project: ['src/**/*.ts']
		},
		'packages/db': {
			entry: ['src/migrate.ts'],
			project: ['src/**/*.ts'],
			drizzle: false
		},
		'packages/email': {
			project: ['src/**/*.{ts,tsx}']
		},
		'packages/logger': {
			project: ['src/**/*.ts']
		}
	}
};

export default config;
