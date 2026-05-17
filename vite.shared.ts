import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin, UserConfig } from 'vite';

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'));

function stripNobleSideEffects(): Plugin {
	return {
		name: 'strip-noble-side-effects',
		transform(code, id) {
			if (!id.includes('@noble/ciphers')) return;
			return code.replaceAll('@__NO_SIDE_EFFECTS__', '');
		}
	};
}

export const sharedConfig: UserConfig = {
	plugins: [stripNobleSideEffects()],
	resolve: {
		extensions: ['.ts', '.js', '.svelte']
	},
	define: {
		__APP_VERSION__: JSON.stringify(pkg.version ?? '0.0.0')
	}
};
