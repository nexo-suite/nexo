import { defineConfig } from 'tsdown';

export default defineConfig({
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
});
