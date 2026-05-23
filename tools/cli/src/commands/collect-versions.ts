import { APPS } from '../apps.ts';

// release-please emits outputs keyed like "apps/auth--version" and
// "packages/db--version". This command reads them off the environment as
// $RP_OUTPUTS_JSON (a JSON blob set in the workflow) and emits the compact
// `{ <app>: <version> }` shape that `nexo promote` consumes.
//
// The downstream workflow step is expected to read this command's stdout
// and feed it to the next job as a step output / job output.
export function collectVersions(): void {
	const raw = process.env.RP_OUTPUTS_JSON;
	if (!raw) {
		console.log('{}');
		return;
	}

	const parsed: Record<string, unknown> = JSON.parse(raw);
	const result: Record<string, string> = {};

	for (const app of APPS) {
		// release-please keys the version output by manifest path.
		const key = `${app.dir}--version`;
		const value = parsed[key];
		if (typeof value === 'string' && value !== '') {
			result[app.name] = value;
		}
	}

	console.log(JSON.stringify(result));
}
