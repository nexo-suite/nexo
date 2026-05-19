// Tiny shim so the same helpers work in both contexts:
//  - SvelteKit: `hooks.server.ts` calls `setFlaschenpostEnv(env)` from
//    `$env/dynamic/private` so values come from .env via Vite.
//  - Worker (esbuild bundle): no SvelteKit virtual modules — falls back to
//    `process.env`, populated by Docker / Node `--env-file`.

let _env: Record<string, string | undefined> = process.env;

export function setFlaschenpostEnv(e: Record<string, string | undefined>): void {
	_env = e;
}

export function flaschenpostEnv(): Record<string, string | undefined> {
	return _env;
}
