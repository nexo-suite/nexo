import { run } from './proc.ts';

// `pnpm --filter <pkg> --prod --legacy deploy <out>` produces a self-contained
// directory: package.json, node_modules, and any files declared in the
// package's `files` array. --legacy keeps the pre-v9 deploy semantics that
// honour the `files` field; the modern deploy includes everything tracked.
export function pnpmDeploy(opts: { pkg: string; out: string; cwd?: string }): void {
	run(
		'pnpm',
		[
			'--filter',
			opts.pkg,
			'--prod',
			'--legacy',
			'--config.confirmModulesPurge=false',
			'deploy',
			opts.out
		],
		{
			cwd: opts.cwd,
			// pnpm's pre-deploy `runDepsStatusCheck` invokes `pnpm install --production`
			// which prompts on modules-dir purge unless CI=true.
			env: { ...process.env, CI: 'true' }
		}
	);
}
