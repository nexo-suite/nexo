import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { APPS, findApp, imageRef, type App } from '../apps.ts';
import { buildxBuild } from '../lib/docker.ts';
import { CONTEXT_FILE, readContext } from '../lib/context.ts';
import { fail, info, section, step, success } from '../lib/log.ts';

export type BuildImagesOpts = {
	app?: string;
	outDir?: string;
	repoRoot?: string;
	tags?: readonly string[];
	push?: boolean;
	gitCommit?: string;
	buildTime?: string;
};

// Build (and optionally push) one or all app images from previously prepared
// contexts. The Dockerfile is expected at <outDir>/<app>/Dockerfile (placed
// there by prepare-contexts).
//
// Without explicit flags, reads tags / push / gitCommit / buildTime from
// `.nexo/ci-context.json`. CLI flags override the context for local runs.
// No-op on the retag fast-path so the CI workflow can call this command
// unconditionally.
export function buildImages(opts: BuildImagesOpts): void {
	const ctx = existsSync(CONTEXT_FILE) ? readContext() : null;
	if (ctx?.strategy === 'retag' && (!opts.tags || opts.tags.length === 0)) {
		section('Build & push container images');
		info(`skipped — strategy=retag (will reuse :${ctx.fromTag})`);
		return;
	}

	const resolved = resolveOpts(opts, ctx);

	const repoRoot = resolve(opts.repoRoot ?? process.cwd());
	const outDir = resolve(repoRoot, opts.outDir ?? 'out');
	const targets = opts.app ? [findApp(opts.app)] : APPS;

	section(
		`Building ${targets.length} image${targets.length === 1 ? '' : 's'}${resolved.push ? ' (and pushing)' : ''}`
	);

	for (const app of targets) {
		buildOne(app, outDir, resolved);
	}
}

type ResolvedBuildOpts = {
	tags: readonly string[];
	push: boolean;
	gitCommit: string;
	buildTime: string;
};

function resolveOpts(
	opts: BuildImagesOpts,
	ctx: ReturnType<typeof readContext> | null
): ResolvedBuildOpts {
	const tags = opts.tags && opts.tags.length > 0 ? opts.tags : ctx?.tags;
	if (!tags || tags.length === 0) {
		fail('build-images: no tags provided and no context file present');
	}
	return {
		tags,
		push: opts.push ?? ctx?.push ?? false,
		gitCommit: opts.gitCommit ?? ctx?.gitCommit ?? 'dev',
		buildTime: opts.buildTime ?? ctx?.buildTime ?? ''
	};
}

function buildOne(app: App, outDir: string, opts: ResolvedBuildOpts): void {
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
			GIT_COMMIT: opts.gitCommit,
			BUILD_TIME: opts.buildTime
		},
		push: opts.push
	});
	success(`${app.name}: image built`);
}
