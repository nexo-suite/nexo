import type { KnipConfig } from 'knip';

const config: KnipConfig = {
	$schema: 'https://unpkg.com/knip@latest/schema.json',
	entry: ['src/routes/**/+*.{ts,js,svelte}'],
	project: ['src/**/*.{ts,js,svelte}'],
	ignoreDependencies: [
		// Consumed by @tailwindcss/vite at build time, not imported in JS
		'tailwindcss',
		// Used via root .prettierrc, not imported directly
		'prettier-plugin-svelte',
		'prettier-plugin-tailwindcss'
	]
};

export default config;
