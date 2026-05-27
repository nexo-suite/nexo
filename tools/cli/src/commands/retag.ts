import { existsSync } from 'node:fs';
import { APPS, findApp, imageRef, type App } from '../apps.ts';
import { imagetoolsCreateAsync } from '../lib/docker.ts';
import { CONTEXT_FILE, readContext } from '../lib/context.ts';
import { fail, info, section, step, success } from '../lib/log.ts';
import { appendSummary, summarySection, summaryTable } from '../lib/summary.ts';

export type RetagOpts = {
	app?: string;
	from?: string;
	to?: readonly string[];
};

// Registry-side retag for one or all apps. No layer pull/push.
//
// Without flags, reads source/destination tags from `.nexo/ci-context.json`
// and no-ops when the context's strategy is 'full'. With explicit --from /
// --to, those override the context — handy for local one-offs.
export async function retag(opts: RetagOpts): Promise<void> {
	const explicit = Boolean(opts.from && opts.to && opts.to.length > 0);
	const ctx = !explicit && existsSync(CONTEXT_FILE) ? readContext() : null;

	if (!explicit && ctx?.strategy === 'full') {
		section('Retag images');
		info('skipped — strategy=full (fresh build was published)');
		appendSummary(
			summarySection('🏷 Retag', '⏭ Skipped — strategy=full (fresh images were just pushed)')
		);
		return;
	}

	const { from, to } = resolveTags(opts, ctx);
	const targets = opts.app ? [findApp(opts.app)] : APPS;
	section(
		`Retagging ${targets.length} image${targets.length === 1 ? '' : 's'} :${from} → ${to.map((t) => `:${t}`).join(', ')}`
	);

	await Promise.all(targets.map((app) => retagOne(app, from, to)));

	appendSummary(
		summarySection(
			'🏷 Retag',
			summaryTable(
				['App', 'From', 'To'],
				targets.map((a) => [`\`${a.name}\``, `\`:${from}\``, to.map((t) => `\`:${t}\``).join(', ')])
			)
		)
	);
}

function resolveTags(
	opts: RetagOpts,
	ctx: ReturnType<typeof readContext> | null
): { from: string; to: readonly string[] } {
	if (opts.from && opts.to && opts.to.length > 0) {
		return { from: opts.from, to: opts.to };
	}
	if (!ctx || !ctx.fromTag || ctx.tags.length === 0) {
		fail(
			`retag: missing context fromTag/tags. ` +
				`Run 'nexo ci-init' first or pass --from / --to explicitly.`
		);
	}
	return { from: opts.from ?? ctx.fromTag, to: opts.to && opts.to.length > 0 ? opts.to : ctx.tags };
}

async function retagOne(app: App, from: string, to: readonly string[]): Promise<void> {
	step(`${app.name}: retag`);
	await imagetoolsCreateAsync(
		imageRef(app, from),
		to.map((t) => imageRef(app, t))
	);
	success(`${app.name}: retagged`);
}
