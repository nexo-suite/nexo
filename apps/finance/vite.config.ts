import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig, mergeConfig, type PluginOption } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { sharedConfig } from '../../vite.shared';

export default mergeConfig(
	sharedConfig,
	defineConfig({
		plugins: [
			paraglideVitePlugin({
				project: './project.inlang',
				outdir: './src/lib/paraglide',
				strategy: ['cookie', 'preferredLanguage', 'baseLocale']
			}) as PluginOption,
			tailwindcss() as PluginOption,
			sveltekit() as PluginOption,
			SvelteKitPWA({
				registerType: 'autoUpdate',
				includeAssets: ['favicon.svg', 'favicon.png', 'apple-touch-icon.png', 'icons/*.png'],
				manifest: {
					id: '/',
					name: 'Finance — Nexo',
					short_name: 'Finance',
					description: 'Personal finance tracker — accounts, expenses, cashflow',
					theme_color: '#16a34a',
					background_color: '#0a0a0a',
					display: 'standalone',
					orientation: 'portrait',
					scope: '/',
					start_url: '/',
					icons: [
						{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
						{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
						{
							src: '/icons/icon-192x192.png',
							sizes: '192x192',
							type: 'image/png',
							purpose: 'maskable'
						},
						{ src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
						{
							src: '/icons/icon-512x512.png',
							sizes: '512x512',
							type: 'image/png',
							purpose: 'maskable'
						}
					]
				},
				workbox: {
					globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
					navigateFallback: '/offline',
					navigateFallbackDenylist: [/^\/api\//],
					runtimeCaching: [{ urlPattern: /^\/api\//, handler: 'NetworkOnly' }]
				},
				devOptions: { enabled: true }
			})
		]
	})
);
