import { copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { APPS, findApp, type App } from '../apps.ts';
import { pnpmDeploy } from '../lib/pnpm.ts';
import { section, step, success } from '../lib/log.ts';

export type PrepareOpts = {
	app?: string;
	outDir?: string;
	repoRoot?: string;
};

// For each requested app, run `pnpm deploy` into `<outDir>/<app>` and copy
// the app's Dockerfile into the resulting context so a subsequent
// `docker build <outDir>/<app>` can find it without -f.
export function prepareContexts(opts: PrepareOpts = {}): void {
	const repoRoot = resolve(opts.repoRoot ?? process.cwd());
	const outDir = resolve(repoRoot, opts.outDir ?? 'out');
	const targets = opts.app ? [findApp(opts.app)] : APPS;

	section(
		`Preparing ${targets.length} build context${targets.length === 1 ? '' : 's'} → ${outDir}`
	);
	mkdirSync(outDir, { recursive: true });

	for (const app of targets) {
		prepareOne(app, outDir, repoRoot);
	}
}

function prepareOne(app: App, outDir: string, repoRoot: string): void {
	const target = join(outDir, app.name);
	step(`${app.name}: pnpm deploy → ${target}`);

	if (existsSync(target)) rmSync(target, { recursive: true, force: true });
	pnpmDeploy({ pkg: app.pkg, out: target, cwd: repoRoot });

	const dockerfileSrc = join(repoRoot, app.dir, 'Dockerfile');
	const dockerfileDst = join(target, 'Dockerfile');
	copyFileSync(dockerfileSrc, dockerfileDst);

	success(`${app.name}: context ready`);
}
