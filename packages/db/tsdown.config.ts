import { defineConfig } from 'tsdown';

// Two builds:
// - dist/index.js  → externalizes drizzle-orm + postgres for the 6 SvelteKit
//                    apps that consume @nexo/db (they install those deps
//                    directly and re-resolve to share a single copy)
// - dist/migrate.js → bundles drizzle-orm + postgres inline so the migrate
//                     Docker image is self-contained (no pnpm deploy,
//                     no node_modules). See `prepare-contexts` strategy='bundle'.
export default defineConfig([
	{
		entry: 'src/index.ts',
		platform: 'node',
		format: 'esm',
		target: 'es2024',
		dts: true,
		clean: true,
		sourcemap: true,
		// rolldown-plugin-dts can't bundle postcss's CJS-style .d.ts files; @sveltejs/kit
		// pulls postcss transitively. Keep these external so consumers resolve types
		// from their own node_modules instead.
		deps: {
			neverBundle: [/^@sveltejs\//, /^postcss/, /^better-auth/, /^esm-env/],
			onlyBundle: false
		},
		outExtensions: () => ({ js: '.js', dts: '.d.ts' })
	},
	{
		entry: 'src/migrate.ts',
		platform: 'node',
		format: 'esm',
		target: 'es2024',
		dts: false,
		clean: false,
		sourcemap: true,
		deps: { alwaysBundle: [/.*/], onlyBundle: false },
		outExtensions: () => ({ js: '.js' })
	}
]);
