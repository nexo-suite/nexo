import { run } from '../lib/proc.ts';
import { isReleasePleasePr, readCiContext, type CiContext } from '../lib/ci.ts';
import { fail, info, section } from '../lib/log.ts';
import { prepareContexts } from './prepare-contexts.ts';
import { buildImages } from './build-images.ts';
import { retag } from './retag.ts';

export type CiOpts = {
	push?: boolean;
	repoRoot?: string;
	repoSlug?: string;
};

// Single entry point used by the build-and-push composite action. Decides
// between three paths based on event metadata, so the workflow YAML stays
// declarative.
export function ci(opts: CiOpts = {}): void {
	const ctx = readCiContext();
	section(`CI build (event=${ctx.eventName}, sha=${ctx.sha.slice(0, 7)})`);

	if (ctx.eventName === 'push') {
		const sourcePr = ctx.sourcePrNumber ?? discoverSourcePr(ctx.sha, opts.repoSlug);
		if (sourcePr) {
			info(`main push has source PR #${sourcePr} — registry retag fast-path`);
			retag({ from: `pr-${sourcePr}`, to: [`main-${ctx.sha}`, 'main'] });
			return;
		}
		info('main push with no source PR — full build');
		fullBuild(ctx, opts, [`main-${ctx.sha}`, 'main']);
		return;
	}

	if (ctx.eventName === 'pull_request') {
		if (!ctx.prNumber) fail('ci: PR_NUMBER not set on pull_request event');
		if (isReleasePleasePr(ctx)) {
			info(`release-please PR — retagging :main as :pr-${ctx.prNumber}`);
			retag({ from: 'main', to: [`pr-${ctx.prNumber}`] });
			return;
		}
		fullBuild(ctx, opts, [`pr-${ctx.prNumber}`]);
		return;
	}

	fail(`ci: unsupported event "${ctx.eventName}"`);
}

function fullBuild(ctx: CiContext, opts: CiOpts, tags: readonly string[]): void {
	// Apps' `files: ["build", ...]` and `["dist", ...]` rely on these outputs
	// existing on disk before pnpm deploy packs them. `pnpm build` honours
	// turbo's task graph, so packages build before apps.
	run('pnpm', ['sync'], { cwd: opts.repoRoot });
	run('pnpm', ['translate'], { cwd: opts.repoRoot });
	run('pnpm', ['build'], { cwd: opts.repoRoot });

	prepareContexts({ repoRoot: opts.repoRoot });
	buildImages({
		repoRoot: opts.repoRoot,
		tags,
		push: opts.push ?? false,
		gitCommit: ctx.sha,
		buildTime: new Date().toISOString()
	});
}

function discoverSourcePr(sha: string, repoSlug: string | undefined): string | null {
	const slug = repoSlug ?? process.env.GITHUB_REPOSITORY;
	if (!slug) return null;
	try {
		const { stdout } = run(
			'gh',
			['api', `/repos/${slug}/commits/${sha}/pulls`, '--jq', '.[0].number // empty'],
			{ capture: true, quiet: true }
		);
		const trimmed = stdout.trim();
		return trimmed === '' ? null : trimmed;
	} catch {
		return null;
	}
}
