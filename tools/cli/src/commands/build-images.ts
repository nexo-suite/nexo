import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { APPS, findApp, imageRef, type App } from '../apps.ts';
import { buildxBuild } from '../lib/docker.ts';
import { fail, section, step, success } from '../lib/log.ts';

export type BuildImagesOpts = {
	app?: string;
	outDir?: string;
	repoRoot?: string;
	tags: readonly string[];
	push?: boolean;
	gitCommit?: string;
	buildTime?: string;
};

// Build (and optionally push) one or all app images from previously prepared
// contexts. The Dockerfile is expected at <outDir>/<app>/Dockerfile (placed
// there by prepare-contexts).
export function buildImages(opts: BuildImagesOpts): void {
	if (opts.tags.length === 0) {
		fail('build-images: no tags provided');
	}

	const repoRoot = resolve(opts.repoRoot ?? process.cwd());
	const outDir = resolve(repoRoot, opts.outDir ?? 'out');
	const targets = opts.app ? [findApp(opts.app)] : APPS;

	section(
		`Building ${targets.length} image${targets.length === 1 ? '' : 's'}${opts.push ? ' (and pushing)' : ''}`
	);

	for (const app of targets) {
		buildOne(app, outDir, opts);
	}
}

function buildOne(app: App, outDir: string, opts: BuildImagesOpts): void {
	const context = join(outDir, app.name);
	if (!existsSync(context)) {
		fail(
			`build-images: context missing for ${app.name} at ${context}. Run prepare-contexts first.`
		);
	}

	step(`${app.name}: docker build`);
	buildxBuild({
		context,
		dockerfile: join(context, 'Dockerfile'),
		tags: opts.tags.map((tag) => imageRef(app, tag)),
		buildArgs: {
			GIT_COMMIT: opts.gitCommit ?? 'dev',
			BUILD_TIME: opts.buildTime ?? ''
		},
		push: opts.push ?? false
	});
	success(`${app.name}: image built`);
}
