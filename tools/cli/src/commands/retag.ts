import { APPS, findApp, imageRef, type App } from '../apps.ts';
import { imagetoolsCreate } from '../lib/docker.ts';
import { section, step, success } from '../lib/log.ts';

export type RetagOpts = {
	app?: string;
	from: string;
	to: readonly string[];
};

// Registry-side retag for one or all apps. No layer pull/push.
export function retag(opts: RetagOpts): void {
	const targets = opts.app ? [findApp(opts.app)] : APPS;
	section(
		`Retagging ${targets.length} image${targets.length === 1 ? '' : 's'} :${opts.from} → ${opts.to.map((t) => `:${t}`).join(', ')}`
	);

	for (const app of targets) {
		retagOne(app, opts);
	}
}

function retagOne(app: App, opts: RetagOpts): void {
	step(`${app.name}: retag`);
	imagetoolsCreate(
		imageRef(app, opts.from),
		opts.to.map((t) => imageRef(app, t))
	);
	success(`${app.name}: retagged`);
}
