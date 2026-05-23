// In-memory state for the unstable orchestrator.
//
// Two source-of-truth notes:
//   • The PR's sticky comment (markdown checkboxes) is the source of truth for
//     *intent* — which services a maintainer wants up for that PR.
//   • The VPS's `.env.unstable` + running containers are the source of truth
//     for *current state* — what's actually deployed.
//
// Persistence: this module keeps an in-memory mirror; every mutation also
// flushes to disk via `store.ts` so PR state, intent, and pin map survive
// bot restarts. `initStateFromDisk()` rehydrates the maps on startup.

export type UnstableApp = 'auth' | 'admin' | 'finance' | 'flaschen' | 'landing';

export const UNSTABLE_APPS: UnstableApp[] = ['auth', 'admin', 'finance', 'flaschen', 'landing'];

export function isUnstableApp(value: string): value is UnstableApp {
	return (UNSTABLE_APPS as string[]).includes(value);
}

export type ImageStatus = 'pending' | 'ready';

export type AppActivity = {
	sinceMs: number;
	runUrl?: string;
};

export type PRState = {
	prNumber: number;
	commentId: number;
	headSha: string;
	images: Record<UnstableApp, ImageStatus>;
	intent: Record<UnstableApp, boolean>;
	activity: Partial<Record<UnstableApp, AppActivity>>;
	// Transient surfaced message — appears as a callout in the sticky comment.
	// Set on workflow failure; cleared on the next successful reconcile.
	notice?: string;
};

export type ServicePin = {
	prNumber: number;
	sinceMs: number;
};

const prState = new Map<number, PRState>();
// Each app may be pinned to at most one PR at a time. v1 invariant.
const pins = new Map<UnstableApp, ServicePin>();

// Bump on every mutation so the persistence module can flush; lazily
// resolved after `initStateFromDisk()` so we don't pay for disk writes
// during the rehydrate-from-snapshot bootstrap.
let onChange: (() => void) | null = null;

export function setOnChange(handler: (() => void) | null): void {
	onChange = handler;
}

function flush(): void {
	if (onChange) onChange();
}

export function initStateFromDisk(loaded: {
	prs: Map<number, PRState>;
	pins: Map<UnstableApp, ServicePin>;
}): void {
	prState.clear();
	for (const [k, v] of loaded.prs) prState.set(k, v);
	pins.clear();
	for (const [k, v] of loaded.pins) pins.set(k, v);
}

export function getPRState(prNumber: number): PRState | undefined {
	return prState.get(prNumber);
}

export function setPRState(state: PRState): void {
	prState.set(state.prNumber, state);
	flush();
}

export function deletePRState(prNumber: number): void {
	prState.delete(prNumber);
	flush();
}

export function listPRStates(): PRState[] {
	return [...prState.values()];
}

export function getPin(app: UnstableApp): ServicePin | undefined {
	return pins.get(app);
}

export function setPin(app: UnstableApp, pin: ServicePin): void {
	pins.set(app, pin);
	flush();
}

export function clearPin(app: UnstableApp): void {
	pins.delete(app);
	flush();
}

// Snapshot accessor for the persistence layer — returns the live maps so
// the store can serialize them without a copy.
export function snapshot(): {
	prs: Map<number, PRState>;
	pins: Map<UnstableApp, ServicePin>;
} {
	return { prs: prState, pins };
}

export function freshImages(): Record<UnstableApp, ImageStatus> {
	const out = {} as Record<UnstableApp, ImageStatus>;
	for (const app of UNSTABLE_APPS) out[app] = 'pending';
	return out;
}

export function freshIntent(): Record<UnstableApp, boolean> {
	const out = {} as Record<UnstableApp, boolean>;
	for (const app of UNSTABLE_APPS) out[app] = false;
	return out;
}

// Per-PR mutex — webhook events for the same PR queue up so checkbox toggles
// don't race each other.
const locks = new Map<number, Promise<unknown>>();

export async function withPRLock<T>(prNumber: number, fn: () => Promise<T>): Promise<T> {
	const prev = locks.get(prNumber) ?? Promise.resolve();
	const next = prev.then(fn, fn);
	locks.set(
		prNumber,
		next.finally(() => {
			if (locks.get(prNumber) === next) locks.delete(prNumber);
		})
	);
	return next;
}
