// Reconciler — given an updated intent, decide what (if anything) to dispatch
// and update local pin state + sticky comment.
//
// Inputs come from three places:
//   • Maintainer ticked/unticked a checkbox     → diff intent
//   • Slash command (`/up`, `/down`, …)          → mutate intent directly
//   • PR closed / production deploy succeeded   → tear down without intent diff
//
// Output is always idempotent: render the comment from current state +
// other-PR pins, and dispatch only the workflow runs needed to converge.

import type { Octokit } from '@octokit/rest';
import { createLogger } from '@nexo/logger';
import { renderComment } from './comment.js';
import { dispatchUnstable, upsertStickyComment, type Env } from './github.js';
import {
	UNSTABLE_APPS,
	clearPin,
	deletePRState,
	getPRState,
	getPin,
	listPRStates,
	setPRState,
	setPin,
	type PRState,
	type ServicePin,
	type UnstableApp
} from './state.js';
import { nowActivity as freshActivity } from './comment.js';

const logger = createLogger('bot');

export type ReconcileInput = {
	octokit: Octokit;
	env: Env;
	prNumber: number;
	// Override the persisted intent before reconciling — used for slash
	// commands and checkbox toggles that already know the desired state.
	intentOverride?: Partial<Record<UnstableApp, boolean>>;
	// Apps for which we should dispatch `up` even if intent didn't change.
	// Used by the registry_package.published handler to redeploy a still-ticked
	// service onto a freshly-built image when the head sha advances.
	forceApps?: UnstableApp[];
};

export async function reconcile(input: ReconcileInput): Promise<void> {
	const { octokit, env, prNumber, intentOverride, forceApps } = input;
	const state = getPRState(prNumber);
	if (!state) {
		logger.warn('reconcile called without state', { prNumber });
		return;
	}

	const previousIntent = { ...state.intent };
	const desiredIntent = { ...previousIntent, ...(intentOverride ?? {}) };
	const force = new Set<UnstableApp>(forceApps ?? []);

	// Compute pin holders so we can refuse intent on apps already taken by
	// another PR (single-up-per-service v1 invariant).
	const otherPRPins = otherPinsFor(prNumber);

	// Apply the intent diff: produce final intent (after refusals), and a list
	// of (app, action) to dispatch. Refusals are silently absorbed — the
	// sticky comment already shows the conflicting other-PR pin via
	// `renderCheckbox`'s ⚠️ branch, so a separate notice is redundant.
	const finalIntent = { ...desiredIntent } as Record<UnstableApp, boolean>;
	const dispatches: Array<{ app: UnstableApp; action: 'up' | 'down' }> = [];

	for (const app of UNSTABLE_APPS) {
		const was = previousIntent[app];
		const want = desiredIntent[app];
		const isForced = force.has(app) && want;
		if (was === want && !isForced) continue;

		if (want) {
			if (otherPRPins[app]) {
				finalIntent[app] = false;
				continue;
			}
			if (state.images[app] !== 'ready') {
				// Don't dispatch yet — wait for the registry_package webhook to
				// flip the image to ready, then re-reconcile.
				finalIntent[app] = true;
				continue;
			}
			dispatches.push({ app, action: 'up' });
			setPin(app, { prNumber, sinceMs: Date.now() });
			state.activity[app] = freshActivity();
		} else {
			const pin = getPin(app);
			if (pin?.prNumber === prNumber) clearPin(app);
			delete state.activity[app];
			dispatches.push({ app, action: 'down' });
		}
	}

	state.intent = finalIntent;
	// A successful intent change clears any prior failure notice — the user
	// took an action, the sticky should reflect the new state without the old
	// banner.
	if (state.notice) state.notice = undefined;
	setPRState(state);

	// Re-render comment with the freshly-applied intent.
	const body = renderComment({
		state,
		otherPRPins: otherPinsFor(prNumber)
	});
	const commentId = await upsertStickyComment(octokit, env, prNumber, body, state.commentId);
	if (commentId !== state.commentId) {
		state.commentId = commentId;
		setPRState(state);
	}

	for (const d of dispatches) {
		await dispatchUnstable(octokit, env, d.action, { service: d.app, prNumber });
	}
}

// Tear down everything for one PR (PR closed, or maintainer typed `/down all`).
// Doesn't touch pins held by other PRs.
export async function tearDownPR(
	octokit: Octokit,
	env: Env,
	prNumber: number,
	opts: { dispatch: boolean } = { dispatch: true }
): Promise<void> {
	const state = getPRState(prNumber);
	if (!state) return;
	for (const app of UNSTABLE_APPS) {
		const pin = getPin(app);
		if (pin?.prNumber === prNumber) clearPin(app);
		state.intent[app] = false;
		delete state.activity[app];
	}
	setPRState(state);
	const body = renderComment({ state, otherPRPins: otherPinsFor(prNumber) });
	const commentId = await upsertStickyComment(octokit, env, prNumber, body, state.commentId);
	if (commentId !== state.commentId) {
		state.commentId = commentId;
		setPRState(state);
	}
	if (opts.dispatch) {
		await dispatchUnstable(octokit, env, 'down-all-for-pr', { prNumber });
	}
}

// Wipe every PR's intent and re-render every sticky comment. Called when
// production deploy succeeds — the deploy script also runs `down-all` on the
// VPS, so by the time we finish here, intent and reality both say "nothing
// pinned."
export async function resetAllAfterDeploy(octokit: Octokit, env: Env): Promise<void> {
	const states = listPRStates();
	for (const state of states) {
		for (const app of UNSTABLE_APPS) {
			state.intent[app] = false;
			delete state.activity[app];
		}
		setPRState(state);
		const body = renderComment({ state, otherPRPins: {} });
		try {
			const commentId = await upsertStickyComment(
				octokit,
				env,
				state.prNumber,
				body,
				state.commentId
			);
			if (commentId !== state.commentId) {
				state.commentId = commentId;
				setPRState(state);
			}
		} catch (e) {
			logger.warn('failed to update sticky on deploy reset', {
				prNumber: state.prNumber,
				error: String(e)
			});
		}
	}
	// After the loop: clear pin map from any leftovers.
	for (const app of UNSTABLE_APPS) clearPin(app);
}

// When a PR is closed, drop its in-memory state too — but tear down first if
// anything is up.
export async function onPRClosed(octokit: Octokit, env: Env, prNumber: number): Promise<void> {
	const state = getPRState(prNumber);
	if (!state) return;
	const hasActive = UNSTABLE_APPS.some((app) => state.intent[app]);
	if (hasActive) {
		await tearDownPR(octokit, env, prNumber, { dispatch: true });
	}
	deletePRState(prNumber);
}

function otherPinsFor(prNumber: number): Partial<Record<UnstableApp, ServicePin>> {
	const out: Partial<Record<UnstableApp, ServicePin>> = {};
	for (const app of UNSTABLE_APPS) {
		const pin = getPin(app);
		if (pin && pin.prNumber !== prNumber) out[app] = pin;
	}
	return out;
}

export function ensurePRState(prNumber: number, defaults: Omit<PRState, 'prNumber'>): PRState {
	const existing = getPRState(prNumber);
	if (existing) return existing;
	const state: PRState = { prNumber, ...defaults };
	setPRState(state);
	return state;
}
