import { defineConfig } from 'tsdown';

// All deps bundled inline so the Docker image only needs dist/index.mjs —
// no package.json, no node_modules. See `prepare-contexts` strategy='bundle'.
export default defineConfig({
	entry: 'src/index.ts',
	platform: 'node',
	format: 'esm',
	target: 'node24',
	dts: false,
	clean: true,
	sourcemap: true,
	deps: { alwaysBundle: [/.*/], onlyBundle: false }
});
