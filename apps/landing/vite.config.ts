import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { paraglide } from '@inlang/paraglide-sveltekit/vite';
import { defineConfig, mergeConfig, type PluginOption } from 'vite';
import { sharedConfig } from '../../vite.shared';

export default mergeConfig(
	sharedConfig,
	defineConfig({
		plugins: [
			paraglide({ project: './project.inlang', outdir: './src/lib/paraglide' }) as PluginOption,
			tailwindcss() as PluginOption,
			sveltekit() as PluginOption
		]
	})
);
