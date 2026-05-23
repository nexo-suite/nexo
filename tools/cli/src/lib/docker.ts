import { run } from './proc.ts';

export type BuildOpts = {
	context: string;
	dockerfile?: string;
	tags: readonly string[];
	buildArgs?: Record<string, string>;
	push?: boolean;
};

export function buildxBuild(opts: BuildOpts): void {
	const args: string[] = ['buildx', 'build'];
	if (opts.dockerfile) args.push('-f', opts.dockerfile);
	for (const tag of opts.tags) args.push('-t', tag);
	for (const [k, v] of Object.entries(opts.buildArgs ?? {})) {
		args.push('--build-arg', `${k}=${v}`);
	}
	args.push(opts.push ? '--push' : '--load');
	args.push(opts.context);
	run('docker', args);
}

// Registry-side manifest copy. No layer pull/push — fast, even for multi-arch
// images. Used for the PR-merged-to-main retag and the release-please retag.
export function imagetoolsCreate(source: string, targets: readonly string[]): void {
	const args: string[] = ['buildx', 'imagetools', 'create'];
	for (const t of targets) args.push('--tag', t);
	args.push(source);
	run('docker', args);
}
