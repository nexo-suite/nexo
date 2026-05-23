// Persistent JSON store for the bot's PR state machine.
//
// State lives in `${BOT_STATE_FILE}` (defaults to `./bot-state.json` for local
// dev; production mounts `/data/bot-state.json` via the `bot_data` volume).
// Every mutation in `state.ts` writes the whole snapshot atomically — file is
// tiny (a few KB), no debouncing needed.
//
// Schema is versioned so a future shape change can be migrated on load.

import { readFileSync, renameSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createLogger } from '@nexo/logger';
import {
	UNSTABLE_APPS,
	freshImages,
	freshIntent,
	type ImageStatus,
	type PRState,
	type ServicePin,
	type UnstableApp
} from './state.js';

const logger = createLogger('bot');

const SCHEMA_VERSION = 1;

type StoredPRState = {
	prNumber: number;
	commentId: number;
	headSha: string;
	images: Record<UnstableApp, ImageStatus>;
	intent: Record<UnstableApp, boolean>;
	activity: Partial<Record<UnstableApp, { sinceMs: number; runUrl?: string }>>;
	notice?: string;
};

type Snapshot = {
	version: number;
	prs: StoredPRState[];
	pins: Partial<Record<UnstableApp, ServicePin>>;
};

export type LoadedState = {
	prs: Map<number, PRState>;
	pins: Map<UnstableApp, ServicePin>;
};

function statePath(): string {
	return process.env.BOT_STATE_FILE ?? './bot-state.json';
}

export function loadStateFromDisk(): LoadedState {
	const path = statePath();
	const empty: LoadedState = { prs: new Map(), pins: new Map() };

	if (!existsSync(path)) {
		logger.info('no state file yet — starting fresh', { path });
		return empty;
	}

	let raw: string;
	try {
		raw = readFileSync(path, 'utf-8');
	} catch (e) {
		logger.error('failed to read state file', { path, error: String(e) });
		return empty;
	}

	let parsed: Snapshot;
	try {
		parsed = JSON.parse(raw) as Snapshot;
	} catch (e) {
		logger.error('state file is not valid JSON — starting fresh', {
			path,
			error: String(e)
		});
		return empty;
	}

	if (parsed.version !== SCHEMA_VERSION) {
		logger.warn('state file has different schema version — starting fresh', {
			path,
			fileVersion: parsed.version,
			expected: SCHEMA_VERSION
		});
		return empty;
	}

	const prs = new Map<number, PRState>();
	for (const stored of parsed.prs ?? []) {
		prs.set(stored.prNumber, normalizePR(stored));
	}

	const pins = new Map<UnstableApp, ServicePin>();
	for (const [app, pin] of Object.entries(parsed.pins ?? {})) {
		if (UNSTABLE_APPS.includes(app as UnstableApp) && pin) {
			pins.set(app as UnstableApp, pin);
		}
	}

	logger.info('loaded state from disk', { path, prs: prs.size, pins: pins.size });
	return { prs, pins };
}

export function saveStateToDisk(state: LoadedState): void {
	const path = statePath();
	const snapshot: Snapshot = {
		version: SCHEMA_VERSION,
		prs: [...state.prs.values()].map(toStored),
		pins: Object.fromEntries(state.pins.entries()) as Snapshot['pins']
	};

	const dir = dirname(path);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

	const tmp = `${path}.tmp`;
	try {
		writeFileSync(tmp, JSON.stringify(snapshot, null, 2), 'utf-8');
		renameSync(tmp, path);
	} catch (e) {
		logger.error('failed to write state file', { path, error: String(e) });
	}
}

// Backfill any new fields that didn't exist when the snapshot was written.
// `images`/`intent`/`activity` keys are the most likely to drift if we ever
// add a sixth unstable app.
function normalizePR(stored: StoredPRState): PRState {
	const images = freshImages();
	const intent = freshIntent();
	const activity: PRState['activity'] = {};
	for (const app of UNSTABLE_APPS) {
		if (stored.images && stored.images[app]) images[app] = stored.images[app];
		if (stored.intent && stored.intent[app]) intent[app] = stored.intent[app];
		if (stored.activity && stored.activity[app]) activity[app] = stored.activity[app];
	}
	return {
		prNumber: stored.prNumber,
		commentId: stored.commentId ?? 0,
		headSha: stored.headSha ?? '',
		images,
		intent,
		activity,
		notice: stored.notice
	};
}

function toStored(state: PRState): StoredPRState {
	return {
		prNumber: state.prNumber,
		commentId: state.commentId,
		headSha: state.headSha,
		images: state.images,
		intent: state.intent,
		activity: state.activity,
		notice: state.notice
	};
}
