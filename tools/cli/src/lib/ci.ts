// Helpers that read GitHub Actions / shared CI environment variables and
// translate them into the structured shape the commands need. Keeping this
// in one place means commands stay testable: pass an object instead of
// reading process.env directly.

export type CiContext = {
	eventName: 'pull_request' | 'push' | 'workflow_dispatch' | string;
	sha: string;
	prNumber: string | null;
	releasePrHeadRef: string | null;
	// Set on main pushes when the merge commit was produced by a PR.
	// Discovered via `gh api repos/<owner>/<repo>/commits/<sha>/pulls`.
	sourcePrNumber: string | null;
};

export function readCiContext(env: NodeJS.ProcessEnv = process.env): CiContext {
	return {
		eventName: env.GITHUB_EVENT_NAME ?? 'unknown',
		sha: env.GITHUB_SHA ?? 'dev',
		prNumber: env.PR_NUMBER && env.PR_NUMBER !== '' ? env.PR_NUMBER : null,
		releasePrHeadRef: env.RELEASE_PR_HEAD_REF || null,
		sourcePrNumber: env.SOURCE_PR_NUMBER || null
	};
}

export function isReleasePleasePr(ctx: CiContext): boolean {
	return (
		ctx.eventName === 'pull_request' && (ctx.releasePrHeadRef ?? '').startsWith('release-please--')
	);
}
