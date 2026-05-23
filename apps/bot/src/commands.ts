// Slash-command parser for the unstable bot.
//
// Supported (one command per comment body):
//
//   /up <app>      — bring up <app>_unstable on this PR's image
//   /down <app>    — tear down <app>_unstable
//   /down all      — tear down every _unstable for this PR
//   /status        — repost / refresh the sticky comment
//
// Anything else is ignored. Parser returns null for non-commands so the
// webhook handler can stay quiet on regular discussion.

import { isUnstableApp, type UnstableApp } from './state.js';

export type SlashCommand =
	| { kind: 'up'; app: UnstableApp }
	| { kind: 'down'; app: UnstableApp }
	| { kind: 'down-all' }
	| { kind: 'status' };

export function parseCommand(body: string): SlashCommand | null {
	for (const rawLine of body.split('\n')) {
		const line = rawLine.trim();
		if (!line.startsWith('/')) continue;
		const tokens = line.split(/\s+/);
		const head = tokens[0]?.toLowerCase();
		const arg = tokens[1]?.toLowerCase();

		if (head === '/status') return { kind: 'status' };

		if (head === '/up') {
			if (arg && isUnstableApp(arg)) return { kind: 'up', app: arg };
			return null;
		}

		if (head === '/down') {
			if (arg === 'all') return { kind: 'down-all' };
			if (arg && isUnstableApp(arg)) return { kind: 'down', app: arg };
			return null;
		}
	}
	return null;
}
