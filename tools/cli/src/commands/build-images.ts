import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { APPS, findApp, imageRef, type App } from '../apps.ts';
import { notifyImagesReady, type ImageReadyEvent } from '../lib/bot-notify.ts';
import { bakeBuild, buildxBuild, type BakeTarget } from '../lib/docker.ts';
import { CONTEXT_FILE, readContext } from '../lib/context.ts';
import { fail, info, section, success } from '../lib/log.ts';
import { appendSummary, summarySection, summaryTable } from '../lib/summary.ts';

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
// All apps are built in a single `docker buildx bake` invocation so BuildKit
// can run them in parallel, dedupe shared base-image layers, and push through
// one auth/connection. The single-app path (`--app <name>`) still uses
// `docker buildx build` directly because there's nothing to parallelise.
//
// Without explicit flags, reads tags / push / gitCommit / buildTime from
// `.nexo/ci-context.json`. CLI flags override the context for local runs.
// No-op on the retag fast-path so the CI workflow can call this command
// unconditionally.
export async function buildImages(opts: BuildImagesOpts): Promise<void> {
	const ctx = existsSync(CONTEXT_FILE) ? readContext() : null;
	if (ctx?.strategy === 'retag' && (!opts.tags || opts.tags.length === 0)) {
		section('Build & push container images');
		info(`skipped — strategy=retag (will reuse :${ctx.fromTag})`);
		appendSummary(
			summarySection(
				'🐳 Container images',
				`⏭ Skipped — retag fast-path (reusing \`:${ctx.fromTag}\`)`
			)
		);
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
		const context = join(outDir, app.name);
		if (!existsSync(context)) {
			fail(
				`build-images: context missing for ${app.name} at ${context}. Run prepare-contexts first.`
			);
		}
	}

	if (targets.length === 1) {
		buildOne(targets[0]!, outDir, resolved);
	} else {
		bakeAll(targets, outDir, resolved);
	}

	appendSummary(
		summarySection(
			`🐳 Container images${resolved.push ? ' (pushed)' : ' (built, not pushed)'}`,
			summaryTable(
				['App', 'Tags'],
				targets.map((a) => [`\`${a.name}\``, resolved.tags.map((t) => `\`:${t}\``).join(', ')])
			)
		)
	);

	// Notify the bot that PR images just landed in GHCR. Only fires when this
	// run pushed a `:pr-N` tag — main and release pushes have nothing for the
	// bot to do. Non-PR runs and local invocations skip emission silently.
	if (resolved.push) {
		const prTag = resolved.tags.find((t) => /^pr-\d+$/.test(t));
		const prNumber = ctx?.prNumber ? Number(ctx.prNumber) : null;
		if (prTag && prNumber && Number.isInteger(prNumber) && prNumber > 0) {
			const events: ImageReadyEvent[] = targets.map((a) => ({
				app: a.name,
				prNumber,
				tag: prTag
			}));
			await notifyImagesReady(events);
		}
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

// OCI label that links a published GHCR package to the source repository.
// Without it, packages live at the org level only and the repo's `package`
// webhook never fires for new pushes — see
// https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry#labelling-container-images
const REPO_URL = 'https://github.com/nexo-suite/nexo';

function buildOne(app: App, outDir: string, opts: ResolvedBuildOpts): void {
	const context = join(outDir, app.name);
	buildxBuild({
		context,
		dockerfile: join(context, 'Dockerfile'),
		tags: opts.tags.map((tag) => imageRef(app, tag)),
		buildArgs: {
			GIT_COMMIT: opts.gitCommit,
			BUILD_TIME: opts.buildTime
		},
		labels: imageLabels(opts),
		push: opts.push
	});
	success(`${app.name}: image built`);
}

function bakeAll(targets: readonly App[], outDir: string, opts: ResolvedBuildOpts): void {
	const labels = imageLabels(opts);
	const bakeTargets: BakeTarget[] = targets.map((app) => ({
		name: app.name,
		context: join(outDir, app.name),
		dockerfile: join(outDir, app.name, 'Dockerfile'),
		tags: opts.tags.map((tag) => imageRef(app, tag)),
		args: {
			GIT_COMMIT: opts.gitCommit,
			BUILD_TIME: opts.buildTime
		},
		labels
	}));
	bakeBuild({
		targets: bakeTargets,
		push: opts.push,
		bakeFile: join(outDir, 'docker-bake.json')
	});
	for (const app of targets) success(`${app.name}: image built`);
}

function imageLabels(opts: ResolvedBuildOpts): Record<string, string> {
	const labels: Record<string, string> = {
		'org.opencontainers.image.source': REPO_URL,
		'org.opencontainers.image.revision': opts.gitCommit
	};
	if (opts.buildTime) labels['org.opencontainers.image.created'] = opts.buildTime;
	return labels;
}
