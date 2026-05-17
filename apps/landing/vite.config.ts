import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig, mergeConfig, type PluginOption } from 'vite';
import { sharedConfig } from '../../vite.shared';

function readVersion(relativePath: string): string {
	const pkg = JSON.parse(readFileSync(resolve(__dirname, relativePath, 'package.json'), 'utf-8'));
	return pkg.version ?? '0.0.0';
}

const appVersions = {
	finance: readVersion('../finance'),
	auth: readVersion('../auth'),
	admin: readVersion('../admin'),
	landing: readVersion('.')
};

export default mergeConfig(
	sharedConfig,
	defineConfig({
		define: {
			__APP_VERSIONS__: JSON.stringify(appVersions)
		},
		plugins: [
			paraglideVitePlugin({
				project: './project.inlang',
				outdir: './src/lib/paraglide',
				strategy: ['cookie', 'preferredLanguage', 'baseLocale']
			}) as PluginOption,
			tailwindcss() as PluginOption,
			sveltekit() as PluginOption
		]
	})
);
