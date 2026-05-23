// Maintainer-only access gate. Every bot mutation (slash command, checkbox
// toggle) calls into here before doing anything. Anything below `write`
// permission gets refused with a polite reply and no workflow dispatch.
//
// 5-minute in-memory cache to avoid hammering the GitHub API.

import type { Octokit } from '@octokit/rest';

const ALLOWED = new Set(['admin', 'maintain', 'write']);
const TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
	allowed: boolean;
	expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

export async function isMaintainer(
	octokit: Octokit,
	owner: string,
	repo: string,
	username: string
): Promise<boolean> {
	const key = `${owner}/${repo}/${username.toLowerCase()}`;
	const hit = cache.get(key);
	const now = Date.now();
	if (hit && hit.expiresAt > now) return hit.allowed;

	let allowed: boolean;
	try {
		const { data } = await octokit.repos.getCollaboratorPermissionLevel({
			owner,
			repo,
			username
		});
		allowed = ALLOWED.has(data.permission);
	} catch {
		allowed = false;
	}
	cache.set(key, { allowed, expiresAt: now + TTL_MS });
	return allowed;
}
