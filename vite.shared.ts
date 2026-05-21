import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, UserConfig } from 'vite';

const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'));
const workspaceRoot = dirname(fileURLToPath(import.meta.url));

function readCommit(): string {
	const env = process.env.GIT_COMMIT ?? process.env.GITHUB_SHA;
	if (env) return env.slice(0, 7);
	try {
		return execSync('git rev-parse --short HEAD', {
			cwd: workspaceRoot,
			stdio: ['ignore', 'pipe', 'ignore']
		})
			.toString()
			.trim();
	} catch {
		return 'dev';
	}
}

const appCommit = readCommit();
const appBuildTime = new Date().toISOString();

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
		__APP_VERSION__: JSON.stringify(pkg.version ?? '0.0.0'),
		__APP_COMMIT__: JSON.stringify(appCommit),
		__APP_BUILD_TIME__: JSON.stringify(appBuildTime)
	},
	server: {
		fs: {
			allow: [workspaceRoot]
		}
	}
};
