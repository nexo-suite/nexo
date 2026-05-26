import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { APPS, findApp, type App } from '../apps.ts';
import { pnpmDeployAsync } from '../lib/pnpm.ts';
import { CONTEXT_FILE, readContext } from '../lib/context.ts';
import { info, section, step, success } from '../lib/log.ts';
import { appendSummary, summarySection, summaryTable } from '../lib/summary.ts';

export type PrepareOpts = {
	app?: string;
	outDir?: string;
	repoRoot?: string;
};

// For each requested app, run `pnpm deploy` into `<outDir>/<app>` and copy
// the app's Dockerfile into the resulting context so a subsequent
// `docker build <outDir>/<app>` can find it without -f.
//
// Deploys run in parallel — pnpm's content-addressed store is concurrency-safe
// and each deploy only ever writes to its own out directory, so we just fan
// them out and await the lot.
//
// No-op on the retag fast-path so the CI workflow can call this command
// unconditionally.
export async function prepareContexts(opts: PrepareOpts = {}): Promise<void> {
	const repoRoot = resolve(opts.repoRoot ?? process.cwd());
	const ctx = existsSync(join(repoRoot, CONTEXT_FILE)) ? readContext({ cwd: repoRoot }) : null;
	if (ctx?.strategy === 'retag') {
		section('Prepare deploy contexts');
		info(`skipped — strategy=retag (will reuse :${ctx.fromTag})`);
		appendSummary(
			summarySection(
				'📦 Deploy contexts',
				`⏭ Skipped — retag fast-path (reusing \`:${ctx.fromTag}\`)`
			)
		);
		return;
	}

	const outDir = resolve(repoRoot, opts.outDir ?? 'out');
	const targets = opts.app ? [findApp(opts.app)] : APPS;

	section(
		`Preparing ${targets.length} build context${targets.length === 1 ? '' : 's'} → ${outDir} (parallel)`
	);
	mkdirSync(outDir, { recursive: true });

	await Promise.all(targets.map((app) => prepareOne(app, outDir, repoRoot)));

	appendSummary(
		summarySection(
			'📦 Deploy contexts',
			summaryTable(
				['App', 'Context'],
				targets.map((a) => [`\`${a.name}\``, `\`out/${a.name}/\``])
			)
		)
	);
}

async function prepareOne(app: App, outDir: string, repoRoot: string): Promise<void> {
	const target = join(outDir, app.name);
	if (existsSync(target)) rmSync(target, { recursive: true, force: true });
	mkdirSync(target, { recursive: true });

	if (app.strategy === 'bundle') {
		// tsdown bundles all deps inline — context is just the app's dist/.
		// No pnpm deploy, no node_modules, no package.json needed at runtime.
		step(`${app.name}: copy dist → ${target}`);
		const distSrc = join(repoRoot, app.dir, 'dist');
		cpSync(distSrc, join(target, 'dist'), { recursive: true });
	} else {
		step(`${app.name}: pnpm deploy → ${target}`);
		await pnpmDeployAsync({ pkg: app.pkg, out: target, cwd: repoRoot });
	}

	const dockerfileSrc = join(repoRoot, app.dir, 'Dockerfile');
	const dockerfileDst = join(target, 'Dockerfile');
	copyFileSync(dockerfileSrc, dockerfileDst);

	success(`${app.name}: context ready`);
}
