export type PreviewApp = 'db' | 'auth' | 'admin' | 'finance' | 'landing';

export const PREVIEW_APPS: PreviewApp[] = ['db', 'auth', 'admin', 'finance', 'landing'];

export type ImageStatus = 'pending' | 'ready' | 'failed';

type DeployStatus = 'idle' | 'waiting' | 'deploying' | 'deployed' | 'failed' | 'stale';

export type PRState = {
	status: DeployStatus;
	sha: string;
	commentId: number;
	images: Record<PreviewApp, ImageStatus>;
	dispatchedAt?: number;
	workflowRunId?: number;
};

const state = new Map<number, PRState>();

export function getState(prNumber: number): PRState | undefined {
	return state.get(prNumber);
}

export function setState(prNumber: number, next: PRState): void {
	state.set(prNumber, next);
}

export function deleteState(prNumber: number): void {
	state.delete(prNumber);
}

export function freshImages(): Record<PreviewApp, ImageStatus> {
	const out = {} as Record<PreviewApp, ImageStatus>;
	for (const app of PREVIEW_APPS) out[app] = 'pending';
	return out;
}

export function allReady(images: Record<PreviewApp, ImageStatus>): boolean {
	return PREVIEW_APPS.every((app) => images[app] === 'ready');
}

export function missingApps(images: Record<PreviewApp, ImageStatus>): PreviewApp[] {
	return PREVIEW_APPS.filter((app) => images[app] !== 'ready');
}

// Locate a deploying PR by workflow run ID — matches workflow_run.completed.
export function findDeployingByRunId(runId: number): { prNumber: number; state: PRState } | null {
	for (const [prNumber, s] of state.entries()) {
		if (s.status === 'deploying' && s.workflowRunId === runId) {
			return { prNumber, state: s };
		}
	}
	return null;
}
