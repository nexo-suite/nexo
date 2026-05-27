import { APPS } from '../apps.ts';
import { success } from '../lib/log.ts';
import { appendSummary, summarySection, summaryTable } from '../lib/summary.ts';

export type DeploySummaryOpts = {
	outcome?: string;
	commit?: string;
	runNumber?: string;
	runId?: string;
	repo?: string;
	versions?: string;
};

export function deploySummary(opts: DeploySummaryOpts): void {
	const outcome = opts.outcome ?? 'unknown';
	const commit = opts.commit ?? '';
	const runNumber = opts.runNumber ?? '';
	const runId = opts.runId ?? '';
	const repo = opts.repo ?? '';
	const versionsRaw = opts.versions ?? '{}';

	const icon = outcome === 'success' ? '✅' : '❌';
	const label = outcome === 'success' ? 'Deployed' : 'Failed';
	const shortSha = commit.slice(0, 7) || 'unknown';
	const runUrl = `https://github.com/${repo}/actions/runs/${runId}`;

	let versions: Record<string, string> = {};
	try {
		versions = JSON.parse(versionsRaw);
	} catch {
		// malformed JSON — show dashes for all apps
	}

	const rows = APPS.map((app) => [`\`${app.name}\``, `\`${versions[app.name] ?? '—'}\``]);

	const header = `**Commit:** \`${shortSha}\`  **Run:** [#${runNumber}](${runUrl})`;
	const body = `${header}\n\n${summaryTable(['App', 'Version'], rows)}`;
	appendSummary(summarySection(`${icon} Deploy — ${label}`, body));

	success(`Summary written: ${icon} ${label} — commit ${shortSha}, run #${runNumber}`);
}
