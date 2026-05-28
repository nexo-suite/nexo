import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { run, runAsync } from './proc.ts';

export type BuildOpts = {
	context: string;
	dockerfile?: string;
	tags: readonly string[];
	buildArgs?: Record<string, string>;
	labels?: Record<string, string>;
	push?: boolean;
};

export function buildxBuild(opts: BuildOpts): void {
	const args: string[] = ['buildx', 'build', '--progress=quiet'];
	if (opts.dockerfile) args.push('-f', opts.dockerfile);
	for (const tag of opts.tags) args.push('-t', tag);
	for (const [k, v] of Object.entries(opts.buildArgs ?? {})) {
		args.push('--build-arg', `${k}=${v}`);
	}
	for (const [k, v] of Object.entries(opts.labels ?? {})) {
		args.push('--label', `${k}=${v}`);
	}
	args.push(opts.push ? '--push' : '--load');
	args.push(opts.context);
	run('docker', args);
}

export type BakeTarget = {
	// Used as the bake target name; must be unique within a single bake run
	// and match the regex BuildKit expects (lowercase + dashes is fine).
	name: string;
	context: string;
	dockerfile?: string;
	tags: readonly string[];
	args?: Record<string, string>;
	labels?: Record<string, string>;
};

// Emit a JSON bake file describing every target, then run `docker buildx
// bake` once. BuildKit handles concurrency internally — targets build in
// parallel, identical layers (e.g. the shared `node:24-alpine` base) are
// pulled and pushed once across the whole group, and pushes share a single
// auth/connection to the registry.
export function bakeBuild(opts: {
	targets: readonly BakeTarget[];
	push: boolean;
	bakeFile: string;
}): void {
	const target: Record<string, unknown> = {};
	for (const t of opts.targets) {
		target[t.name] = {
			context: t.context,
			dockerfile: t.dockerfile ?? 'Dockerfile',
			tags: [...t.tags],
			args: t.args ?? {},
			labels: t.labels ?? {},
			output: [opts.push ? 'type=registry' : 'type=docker']
		};
	}
	const bake = {
		target,
		group: { default: { targets: opts.targets.map((t) => t.name) } }
	};
	mkdirSync(dirname(opts.bakeFile), { recursive: true });
	writeFileSync(opts.bakeFile, JSON.stringify(bake, null, 2));
	run('docker', ['buildx', 'bake', '--progress=quiet', '-f', opts.bakeFile]);
}

// Registry-side manifest copy. No layer pull/push — fast, even for multi-arch
// images. Each call is a registry round-trip; run several with Promise.all to
// collapse N× latency into 1×. Used for the PR-merged-to-main retag and the
// release-please retag.
export async function imagetoolsCreateAsync(
	source: string,
	targets: readonly string[]
): Promise<void> {
	const args: string[] = ['buildx', 'imagetools', 'create'];
	for (const t of targets) args.push('--tag', t);
	args.push(source);
	await runAsync('docker', args);
}
