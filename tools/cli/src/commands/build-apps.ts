import { run } from '../lib/proc.ts';
import { readContext } from '../lib/context.ts';
import { info, section, success } from '../lib/log.ts';

// Wraps `pnpm build`. No-op on the retag fast-path so the workflow can call
// it unconditionally — the CI YAML stays a flat list of named steps.
export function buildApps(opts: { cwd?: string } = {}): void {
	const ctx = readContext();
	section('Build apps');
	if (ctx.strategy === 'retag') {
		info(`skipped — strategy=retag (will reuse :${ctx.fromTag})`);
		return;
	}
	run('pnpm', ['build'], { cwd: opts.cwd });
	success('apps built');
}
