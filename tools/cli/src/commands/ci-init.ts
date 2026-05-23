import { appendFileSync } from 'node:fs';
import { run } from '../lib/proc.ts';
import { writeContext, type CiContext, type Strategy } from '../lib/context.ts';
import { fail, info, section, success } from '../lib/log.ts';

// Build the immutable CI context for this run and persist it to
// `.nexo/ci-context.json`. Subsequent commands (retag, prepare-contexts,
// build-images) read that file instead of parsing env vars themselves.
//
// A few values are also echoed to $GITHUB_OUTPUT so the workflow YAML can
// gate steps on them (`if: steps.ctx.outputs.strategy == 'full'`).
export function ciInit(): void {
	const env = process.env;
	const eventName = env.GITHUB_EVENT_NAME ?? 'unknown';
	const sha = env.GITHUB_SHA ?? 'dev';
	const repoSlug = env.GITHUB_REPOSITORY || null;
	const prNumber = nonEmpty(env.PR_NUMBER);
	const releasePrHeadRef = env.RELEASE_PR_HEAD_REF || null;
	const isReleasePleasePr =
		eventName === 'pull_request' && (releasePrHeadRef ?? '').startsWith('release-please--');

	section(`CI init (event=${eventName}, sha=${sha.slice(0, 7)})`);

	const sourcePrNumber =
		eventName === 'push'
			? (nonEmpty(env.SOURCE_PR_NUMBER) ?? discoverSourcePr(sha, repoSlug))
			: null;

	const { strategy, tags, fromTag } = decideStrategy({
		eventName,
		sha,
		prNumber,
		isReleasePleasePr,
		sourcePrNumber
	});

	const headRepo = env.HEAD_REPO_FULL_NAME || null;
	const push = eventName === 'push' || (headRepo !== null && headRepo === repoSlug);

	const ctx: CiContext = {
		event: eventName,
		sha,
		repoSlug,
		prNumber,
		sourcePrNumber,
		isReleasePleasePr,
		strategy,
		tags,
		fromTag,
		push,
		gitCommit: sha,
		buildTime: new Date().toISOString()
	};

	writeContext(ctx);
	emitOutputs(ctx);
	success(
		`strategy=${strategy} tags=${tags.join(',')} push=${push}` + (fromTag ? ` from=${fromTag}` : '')
	);
}

function decideStrategy(params: {
	eventName: string;
	sha: string;
	prNumber: string | null;
	isReleasePleasePr: boolean;
	sourcePrNumber: string | null;
}): { strategy: Strategy; tags: string[]; fromTag: string | null } {
	const { eventName, sha, prNumber, isReleasePleasePr, sourcePrNumber } = params;

	if (eventName === 'push') {
		if (sourcePrNumber) {
			info(`main push has source PR #${sourcePrNumber} — registry retag fast-path`);
			return { strategy: 'retag', fromTag: `pr-${sourcePrNumber}`, tags: [`main-${sha}`, 'main'] };
		}
		info('main push with no source PR — full build');
		return { strategy: 'full', fromTag: null, tags: [`main-${sha}`, 'main'] };
	}

	if (eventName === 'pull_request') {
		if (!prNumber) fail('ci-init: PR_NUMBER not set on pull_request event');
		if (isReleasePleasePr) {
			info(`release-please PR — retagging :main as :pr-${prNumber}`);
			return { strategy: 'retag', fromTag: 'main', tags: [`pr-${prNumber}`] };
		}
		return { strategy: 'full', fromTag: null, tags: [`pr-${prNumber}`] };
	}

	fail(`ci-init: unsupported event "${eventName}"`);
}

// $GITHUB_OUTPUT only carries the values the workflow YAML needs for step
// `if:` gates. Everything else lives in the context file.
function emitOutputs(ctx: CiContext): void {
	const target = process.env.GITHUB_OUTPUT;
	if (!target) return;
	const lines = [`strategy=${ctx.strategy}`, `push=${ctx.push}`];
	appendFileSync(target, lines.join('\n') + '\n');
}

function discoverSourcePr(sha: string, repoSlug: string | null): string | null {
	if (!repoSlug) return null;
	try {
		const { stdout } = run(
			'gh',
			['api', `/repos/${repoSlug}/commits/${sha}/pulls`, '--jq', '.[0].number // empty'],
			{ capture: true, quiet: true }
		);
		const trimmed = stdout.trim();
		return trimmed === '' ? null : trimmed;
	} catch {
		return null;
	}
}

function nonEmpty(value: string | undefined): string | null {
	return value && value !== '' ? value : null;
}
