#!/usr/bin/env -S node --experimental-strip-types --no-warnings=ExperimentalLoader

import { Command } from 'commander';
import { prepareContexts } from './commands/prepare-contexts.ts';
import { buildImages } from './commands/build-images.ts';
import { buildApps } from './commands/build-apps.ts';
import { retag } from './commands/retag.ts';
import { promote } from './commands/promote.ts';
import { ciInit } from './commands/ci-init.ts';
import { collectVersions } from './commands/collect-versions.ts';
import { deploySummary, type DeploySummaryOpts } from './commands/deploy-summary.ts';
import { fail } from './lib/log.ts';

const program = new Command();

program
	.name('nexo')
	.description('Build, tag, and promote Nexo container images.')
	.showHelpAfterError();

program
	.command('ci-init')
	.description(
		'Build the immutable CI context for this run; persist to .nexo/ci-context.json. ' +
			'Run as the first build step — every other nexo command reads from that file.'
	)
	.action(() => {
		ciInit();
	});

program
	.command('build-apps')
	.description('Run `pnpm build`; no-ops on the retag fast-path')
	.action(() => {
		buildApps();
	});

program
	.command('prepare-contexts')
	.description('Run pnpm deploy for each app into ./out/<app>')
	.option('-a, --app <name>', 'restrict to a single app')
	.option('-o, --out-dir <path>', 'output directory', 'out')
	.action(async (opts: { app?: string; outDir: string }) => {
		await prepareContexts({ app: opts.app, outDir: opts.outDir });
	});

program
	.command('build-images')
	.description(
		'Build (and optionally push) images from prepared contexts. ' +
			'Reads tags / push / gitCommit / buildTime from the CI context unless overridden.'
	)
	.option('-a, --app <name>', 'restrict to a single app')
	.option('-o, --out-dir <path>', 'context root', 'out')
	.option('-t, --tag <tag...>', 'image tag (repeatable, overrides context)')
	.option('--push', 'push to GHCR after build (overrides context)')
	.option('--git-commit <sha>')
	.option('--build-time <iso>')
	.action(
		(opts: {
			app?: string;
			outDir: string;
			tag?: string[];
			push?: boolean;
			gitCommit?: string;
			buildTime?: string;
		}) => {
			buildImages({
				app: opts.app,
				outDir: opts.outDir,
				tags: opts.tag,
				push: opts.push,
				gitCommit: opts.gitCommit,
				buildTime: opts.buildTime
			});
		}
	);

program
	.command('retag')
	.description(
		'Registry-side retag (no layer ops) for one or all apps. ' +
			'Reads from-tag / tags from the CI context unless overridden.'
	)
	.option('-a, --app <name>', 'restrict to a single app')
	.option('--from <tag>', 'source tag (overrides context)')
	.option('--to <tag...>', 'one or more destination tags (overrides context)')
	.action(async (opts: { app?: string; from?: string; to?: string[] }) => {
		await retag({ app: opts.app, from: opts.from, to: opts.to });
	});

program
	.command('promote')
	.description('Promote :main-<sha> to :latest and :<version> per release-please outputs')
	.option('--git-commit <sha>', 'release SHA', process.env.GITHUB_SHA)
	.option(
		'--versions <json>',
		'JSON object mapping app name → version',
		process.env.RELEASE_VERSIONS_JSON
	)
	.action(async (opts: { gitCommit?: string; versions?: string }) => {
		const versions: Record<string, string> = opts.versions ? JSON.parse(opts.versions) : {};
		await promote({ gitCommit: opts.gitCommit ?? '', versions });
	});

program
	.command('collect-versions')
	.description('Read $RP_OUTPUTS_JSON and emit {<app>: <version>} on stdout')
	.action(() => {
		collectVersions();
	});

program
	.command('deploy-summary')
	.description('Write a production deploy result to $GITHUB_STEP_SUMMARY')
	.option('--outcome <status>', 'step outcome (success|failure|…)', process.env.DEPLOY_OUTCOME)
	.option('--commit <sha>', 'git SHA', process.env.COMMIT_SHA)
	.option('--run-number <n>', 'Actions run number', process.env.RUN_NUMBER)
	.option('--run-id <id>', 'Actions run ID', process.env.RUN_ID)
	.option('--repo <owner/name>', 'GitHub repo slug', process.env.REPO)
	.option('--versions <json>', 'versions JSON object', process.env.VERSIONS_JSON)
	.action((opts: DeploySummaryOpts) => {
		deploySummary(opts);
	});

program.parseAsync(process.argv).catch((err) => {
	fail(err instanceof Error ? err.message : String(err));
});
