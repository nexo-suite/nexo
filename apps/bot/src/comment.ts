// Sticky-comment render and parse.
//
// Comment shape:
//
//   <!-- nexo-unstable pr:123 -->
//   ## 🧪 Unstable deployments — restricted to maintainers
//   ...
//
// The HTML comment marker is how we find the bot's own comment again on
// later webhooks (issues.listComments → first body containing the marker).
//
// `parseIntent` reads back the checkboxes after a maintainer ticks one and
// gives us a fresh intent map; the reconciler then diffs that against
// current state and dispatches up/down workflows.

import {
	UNSTABLE_APPS,
	type AppActivity,
	type ImageStatus,
	type PRState,
	type ServicePin,
	type UnstableApp
} from './state.js';

export const MARKER = (prNumber: number) => `<!-- nexo-unstable pr:${prNumber} -->`;

const APP_LABEL: Record<UnstableApp, string> = {
	auth: 'auth',
	admin: 'admin',
	finance: 'finance',
	flaschen: 'flaschen',
	landing: 'landing'
};

const IMAGE_ICON: Record<ImageStatus, string> = {
	pending: '⏳ building',
	ready: '✅ ready'
};

export type RenderContext = {
	state: PRState;
	// Pin held by another PR, keyed by app (this PR's own pins are not in here).
	otherPRPins: Partial<Record<UnstableApp, ServicePin>>;
};

export function renderComment(ctx: RenderContext): string {
	const { state } = ctx;
	const tagBase = `:pr-${state.prNumber}`;

	const imageRows = UNSTABLE_APPS.map(
		(app) =>
			`| ${APP_LABEL[app]} | \`ghcr.io/nexo-suite/nexo-${app}${tagBase}\` | ${IMAGE_ICON[state.images[app]]} |`
	);

	const checkboxes = UNSTABLE_APPS.map((app) => renderCheckbox(app, ctx));

	const noticeBlock = state.notice ? [`> [!warning]`, `> ${state.notice}`, ''] : [];

	return [
		MARKER(state.prNumber),
		'## 🧪 Unstable deployments — restricted to maintainers',
		'',
		...noticeBlock,
		`This PR's images: \`ghcr.io/nexo-suite/nexo-<app>:pr-${state.prNumber}\``,
		'',
		'### Image build status',
		'',
		'| App | Image | Status |',
		'|---|---|---|',
		...imageRows,
		'',
		'### Run unstable instance alongside production',
		'',
		"Tick a box to spin up a parallel container of that service running this PR's image. Untick to tear it down.",
		'',
		...checkboxes,
		'',
		'To opt in as a viewer: open the app\'s settings → Diagnostics → "Use unstable when available". Untick to go back.',
		'',
		'> Auto-clears on PR close and after every production release deploy.',
		'> Slash-commands: `/up <app>`, `/down <app>`, `/down all`, `/status`'
	].join('\n');
}

function renderCheckbox(app: UnstableApp, ctx: RenderContext): string {
	const { state, otherPRPins } = ctx;
	const intent = state.intent[app];
	const image = state.images[app];
	const otherPin = otherPRPins[app];
	const activity = state.activity[app];
	const box = intent ? '[x]' : '[ ]';

	if (otherPin) {
		// Render unticked + footnote — tickability is a UX hint; the actual gate
		// is in the reconciler.
		return `- [ ] ${APP_LABEL[app]} — ⚠️ currently up for [#${otherPin.prNumber}](#${otherPin.prNumber}) — close that PR first`;
	}

	if (intent && activity) {
		const since = new Date(activity.sinceMs).toISOString().replace('T', ' ').slice(0, 16);
		const link = activity.runUrl ? ` ([logs](${activity.runUrl}))` : '';
		return `- ${box} **${APP_LABEL[app]}** — running since ${since}${link}`;
	}

	if (image === 'pending') {
		return `- ${box} ${APP_LABEL[app]} — image not ready yet`;
	}

	return `- ${box} ${APP_LABEL[app]} — stable (\`:latest\`)`;
}

// Pull intent (which boxes are ticked) from a comment body. Order is the
// canonical UNSTABLE_APPS list; render and parse must agree on bullet shape.
export function parseIntent(body: string): Record<UnstableApp, boolean> {
	const out = {} as Record<UnstableApp, boolean>;
	for (const app of UNSTABLE_APPS) out[app] = false;
	for (const app of UNSTABLE_APPS) {
		// Match either "- [x] **app**" / "- [x] app" / "- [X] app" — anything with
		// the app name immediately following the checkbox.
		const re = new RegExp(`^\\s*-\\s*\\[(x|X)\\]\\s*\\*{0,2}${app}\\b`, 'm');
		if (re.test(body)) out[app] = true;
	}
	return out;
}

export function extractPRFromMarker(body: string): number | null {
	const m = body.match(/<!-- nexo-unstable pr:(\d+) -->/);
	return m ? Number(m[1]) : null;
}

// Helper for the reconciler: synthesize an activity record from "now".
export function nowActivity(runUrl?: string): AppActivity {
	return { sinceMs: Date.now(), runUrl };
}
