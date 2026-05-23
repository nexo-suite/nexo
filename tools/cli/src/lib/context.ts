// Shared CI/build context — single source of truth for one CI run.
//
// `nexo ci-init` reads the GitHub Actions environment once at the start of the
// build job, decides retag-vs-full, computes tags, and freezes the result into
// `.nexo/ci-context.json`. Every subsequent command (`retag`, `prepare-contexts`,
// `build-images`) loads that file instead of re-parsing env vars.
//
// Pattern adapted from the deploy-context idea in nui-rail's deploy-atm.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fail } from './log.ts';

export const CONTEXT_FILE = '.nexo/ci-context.json';

export type Strategy = 'retag' | 'full';

export type CiContext = {
	// Raw event metadata captured from the workflow environment.
	event: 'push' | 'pull_request' | string;
	sha: string;
	repoSlug: string | null;
	prNumber: string | null;
	sourcePrNumber: string | null;
	isReleasePleasePr: boolean;

	// Decided build strategy.
	strategy: Strategy;
	tags: readonly string[];
	fromTag: string | null; // populated when strategy === 'retag'

	// Build-time metadata propagated into the image.
	push: boolean;
	gitCommit: string;
	buildTime: string; // ISO 8601 UTC
};

// Read the context file into a frozen object so callers can't mutate shared
// state mid-run. Throws a clear error if the file is missing — usually means
// `nexo ci-init` wasn't run as the first build step.
export function readContext(opts: { cwd?: string } = {}): Readonly<CiContext> {
	const path = resolve(opts.cwd ?? process.cwd(), CONTEXT_FILE);
	if (!existsSync(path)) {
		fail(
			`Could not load CI context from ${CONTEXT_FILE}. ` +
				`Run 'nexo ci-init' as the first build step before any other nexo command.`
		);
	}
	const raw = readFileSync(path, 'utf-8');
	let parsed: CiContext;
	try {
		parsed = JSON.parse(raw) as CiContext;
	} catch (err) {
		fail(`CI context at ${CONTEXT_FILE} is not valid JSON: ${(err as Error).message}`);
	}
	return Object.freeze(parsed);
}

export function writeContext(ctx: CiContext, opts: { cwd?: string } = {}): void {
	const path = resolve(opts.cwd ?? process.cwd(), CONTEXT_FILE);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, JSON.stringify(ctx, null, 2) + '\n', 'utf-8');
}
