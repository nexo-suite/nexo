import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig, mergeConfig } from 'vite';
import { sharedConfig } from '../../vite.shared';

export default mergeConfig(
	sharedConfig,
	defineConfig({
		plugins: [
			paraglideVitePlugin({
				project: './project.inlang',
				outdir: './src/lib/paraglide',
				strategy: ['cookie', 'preferredLanguage', 'baseLocale']
			}),
			tailwindcss(),
			sveltekit()
		]
	})
);
