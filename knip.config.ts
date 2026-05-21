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
			ignoreDependencies: ['@nexo/ui', 'tailwindcss']
		},
		'apps/admin': {
			entry: SVELTE_ENTRY,
			project: SVELTE_PROJECT,
			ignoreDependencies: ['tailwindcss']
		},
		'apps/finance': {
			entry: SVELTE_ENTRY,
			project: SVELTE_PROJECT,
			ignore: ['src/lib/index.ts', 'src/lib/utils.ts'],
			ignoreDependencies: [
				'@fontsource-variable/inter',
				'@fontsource-variable/jetbrains-mono',
				'tailwindcss'
			]
		},
		'apps/flaschen': {
			entry: SVELTE_ENTRY,
			project: SVELTE_PROJECT,
			ignoreDependencies: ['tailwindcss', 'web-push']
		},
		'apps/bot': {
			project: ['src/**/*.ts']
		},
		'packages/db': {
			entry: ['src/index.ts', 'src/migrate.ts', 'schema/*.ts'],
			project: ['src/**/*.ts', 'schema/**/*.ts'],
			drizzle: false
		},
		'packages/email': {
			entry: ['src/index.ts'],
			project: ['src/**/*.{ts,tsx}']
		},
		'packages/errors': {
			project: ['src/**/*.ts']
		},
		'packages/i18n': {
			project: ['src/**/*.ts']
		},
		'packages/logger': {
			entry: ['src/index.ts'],
			project: ['src/**/*.ts']
		},
		'packages/push': {
			entry: [
				'src/index.ts',
				'src/schema.ts',
				'src/server.ts',
				'src/routes.ts',
				'src/client.ts',
				'src/sw.ts'
			],
			project: ['src/**/*.ts']
		},
		'packages/security': {
			entry: ['src/index.ts'],
			project: ['src/**/*.ts']
		},
		'packages/ui': {
			project: ['src/**/*.{ts,svelte}'],
			ignoreUnresolved: [/^\$app\//]
		}
	}
};

export default config;
