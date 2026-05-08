import type { KnipConfig } from 'knip';

const config: KnipConfig = {
	$schema: 'https://unpkg.com/knip@latest/schema.json',
	entry: ['src/routes/**/+*.{ts,js,svelte}'],
	project: ['src/**/*.{ts,js,svelte}'],
	ignore: [
		// shadcn-svelte generated components — maintained by the CLI, not us
		'src/lib/components/ui/**',
		// empty SvelteKit placeholder
		'src/lib/index.ts',
		// cn() helper used exclusively by shadcn components (above ignored path)
		'src/lib/utils.ts'
	]
};

export default config;
