import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { paraglide } from '@inlang/paraglide-sveltekit/vite';
import { defineConfig, mergeConfig, type PluginOption } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { sharedConfig } from '../../vite.shared';

export default mergeConfig(
	sharedConfig,
	defineConfig({
		plugins: [
			paraglide({ project: './project.inlang', outdir: './src/lib/paraglide' }) as PluginOption,
			tailwindcss() as PluginOption,
			sveltekit() as PluginOption,
			SvelteKitPWA({
				registerType: 'autoUpdate',
				includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/*.png'],
				manifest: {
					id: '/',
					name: 'Admin — Nexo',
					short_name: 'Admin',
					description: 'Server admin dashboard — services, users, logs',
					theme_color: '#3b82f6',
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
