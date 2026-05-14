import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { paraglide } from '@inlang/paraglide-sveltekit/vite';
import { defineConfig, mergeConfig } from 'vite';
import { sharedConfig } from '../../vite.shared';

export default mergeConfig(
	sharedConfig,
	defineConfig({
		plugins: [
			paraglide({ project: './project.inlang', outdir: './src/lib/paraglide' }),
			tailwindcss(),
			sveltekit()
		]
	})
);
