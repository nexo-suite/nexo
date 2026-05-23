import { appendFileSync } from 'node:fs';
import { run } from '../lib/proc.ts';
import { isReleasePleasePr, readCiContext, type CiContext } from '../lib/ci.ts';
import { fail, info, section, success } from '../lib/log.ts';

export type DecideOpts = {
	repoSlug?: string;
};

type Strategy = {
	kind: 'retag' | 'full';
	tags: readonly string[];
	from?: string;
};

// Decide whether the workflow should retag an existing image (fast-path) or
// run a full build, and emit the result to $GITHUB_OUTPUT. The workflow then
// branches on `outputs.strategy` and feeds `outputs.tags` / `outputs.from-tag`
// into the explicit retag / build steps. Pure decision: no build side effects.
export function ciDecide(opts: DecideOpts = {}): void {
	const ctx = readCiContext();
	section(`CI decide (event=${ctx.eventName}, sha=${ctx.sha.slice(0, 7)})`);

	const strategy = pickStrategy(ctx, opts);
	emit(strategy);
	success(`strategy=${strategy.kind} tags=${strategy.tags.join(',')}`);
}

function pickStrategy(ctx: CiContext, opts: DecideOpts): Strategy {
	if (ctx.eventName === 'push') {
		const sourcePr = ctx.sourcePrNumber ?? discoverSourcePr(ctx.sha, opts.repoSlug);
		if (sourcePr) {
			info(`main push has source PR #${sourcePr} — registry retag fast-path`);
			return { kind: 'retag', from: `pr-${sourcePr}`, tags: [`main-${ctx.sha}`, 'main'] };
		}
		info('main push with no source PR — full build');
		return { kind: 'full', tags: [`main-${ctx.sha}`, 'main'] };
	}

	if (ctx.eventName === 'pull_request') {
		if (!ctx.prNumber) fail('ci-decide: PR_NUMBER not set on pull_request event');
		if (isReleasePleasePr(ctx)) {
			info(`release-please PR — retagging :main as :pr-${ctx.prNumber}`);
			return { kind: 'retag', from: 'main', tags: [`pr-${ctx.prNumber}`] };
		}
		return { kind: 'full', tags: [`pr-${ctx.prNumber}`] };
	}

	fail(`ci-decide: unsupported event "${ctx.eventName}"`);
}

function emit(strategy: Strategy): void {
	const lines = [
		`strategy=${strategy.kind}`,
		`tags=${strategy.tags.join(',')}`,
		`from-tag=${strategy.from ?? ''}`
	];
	const target = process.env.GITHUB_OUTPUT;
	if (target) {
		appendFileSync(target, lines.join('\n') + '\n');
	} else {
		// Local dry-run: print to stdout so devs can inspect.
		for (const line of lines) console.log(line);
	}
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
