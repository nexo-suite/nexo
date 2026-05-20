import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, UserConfig } from 'vite';

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'));
const workspaceRoot = dirname(fileURLToPath(import.meta.url));

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
	},
	server: {
		fs: {
			allow: [workspaceRoot]
		}
	}
};
