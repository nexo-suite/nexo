import { APPS, imageRef, type App } from '../apps.ts';
import { imagetoolsCreate } from '../lib/docker.ts';
import { fail, info, section, step, success } from '../lib/log.ts';

export type PromoteOpts = {
	gitCommit: string;
	versions: Record<string, string>;
};

// release-please publishes one version per app. For each app, retag
// :main-<sha> as :latest and :<version>. Apps with no version in this
// release are skipped (their :latest remains pointed at whatever the last
// release pinned).
export function promote(opts: PromoteOpts): void {
	if (!opts.gitCommit || opts.gitCommit === 'dev') {
		fail('promote: GIT_COMMIT/GITHUB_SHA must be set to the release SHA');
	}

	const releasing = APPS.filter((a) => versionFor(a, opts.versions));
	const skipping = APPS.filter((a) => !versionFor(a, opts.versions));

	section(`Promoting ${releasing.length} image${releasing.length === 1 ? '' : 's'}`);
	if (skipping.length > 0) {
		info(`Skipping (no release this run): ${skipping.map((a) => a.name).join(', ')}`);
	}

	for (const app of releasing) {
		const version = versionFor(app, opts.versions)!;
		promoteOne(app, opts.gitCommit, version);
	}
}

function promoteOne(app: App, sha: string, version: string): void {
	step(`${app.name}: :main-${sha.slice(0, 7)} → :latest, :${version}`);
	imagetoolsCreate(imageRef(app, `main-${sha}`), [imageRef(app, 'latest'), imageRef(app, version)]);
	success(`${app.name}: promoted`);
}

// release-please's manifest keys come in two shapes depending on whether
// the package lives under apps/ or packages/. We match either.
function versionFor(app: App, versions: Record<string, string>): string | null {
	return versions[app.name] || versions[app.dir] || null;
}
