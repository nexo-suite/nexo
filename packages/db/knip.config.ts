import type { KnipConfig } from 'knip';

const config: KnipConfig = {
	$schema: 'https://unpkg.com/knip@latest/schema.json',
	entry: ['src/migrate.ts'],
	project: ['src/**/*.ts'],
	drizzle: false
};

export default config;
