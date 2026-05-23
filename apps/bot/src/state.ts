// In-memory state for the unstable orchestrator.
//
// Two source-of-truth notes:
//   • The PR's sticky comment (markdown checkboxes) is the source of truth for
//     *intent* — which services a maintainer wants up for that PR.
//   • The VPS's `.env.unstable` + running containers are the source of truth
//     for *current state* — what's actually deployed.
//
// This file holds the bot's reconciler view. State is rebuilt from webhooks
// on every restart; nothing is persisted. Re-syncs happen on PR open/sync
// and after workflow_run completion.

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
};

export type ServicePin = {
	prNumber: number;
	sinceMs: number;
};

const prState = new Map<number, PRState>();
// Each app may be pinned to at most one PR at a time. v1 invariant.
const pins = new Map<UnstableApp, ServicePin>();

export function getPRState(prNumber: number): PRState | undefined {
	return prState.get(prNumber);
}

export function setPRState(state: PRState): void {
	prState.set(state.prNumber, state);
}

export function deletePRState(prNumber: number): void {
	prState.delete(prNumber);
}

export function listPRStates(): PRState[] {
	return [...prState.values()];
}

export function getPin(app: UnstableApp): ServicePin | undefined {
	return pins.get(app);
}

export function setPin(app: UnstableApp, pin: ServicePin): void {
	pins.set(app, pin);
}

export function clearPin(app: UnstableApp): void {
	pins.delete(app);
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
