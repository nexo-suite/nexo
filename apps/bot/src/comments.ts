import { PREVIEW_APPS, type ImageStatus, type PreviewApp } from './state.js';

const APP_LABEL: Record<PreviewApp, string> = {
	db: 'Migrations',
	auth: 'Auth',
	admin: 'Admin',
	finance: 'Finance',
	landing: 'Landing'
};

const ICON: Record<ImageStatus, string> = {
	pending: '⏳',
	ready: '✅',
	failed: '❌'
};

export const MARKER = (prNumber: number) => `<!-- nexo-preview pr:${prNumber} -->`;

const PREVIEW_URL_TABLE = [
	'| App | URL |',
	'|---|---|',
	'| Landing | https://preview.krieger2501.de |',
	'| Finance | https://finance.preview.krieger2501.de |',
	'| Auth | https://auth.preview.krieger2501.de |',
	'| Admin | https://admin.preview.krieger2501.de |'
].join('\n');

function imageChecklist(images: Record<PreviewApp, ImageStatus>, prNumber: number): string {
	return PREVIEW_APPS.map(
		(app) => `- ${ICON[images[app]]} ${APP_LABEL[app]} \`nexo-${app}:pr-${prNumber}\``
	).join('\n');
}

export function idleComment(prNumber: number): string {
	return [
		'### Nexo Preview',
		'',
		'**Status:** 💤 Idle — no deployment yet',
		'',
		'- [ ] Deploy to preview environment',
		'',
		MARKER(prNumber)
	].join('\n');
}

export function waitingComment(
	prNumber: number,
	sha: string,
	images: Record<PreviewApp, ImageStatus>
): string {
	return [
		'### Nexo Preview',
		'',
		`**Status:** ⏳ Waiting for images @ \`${sha.slice(0, 7)}\``,
		'',
		imageChecklist(images, prNumber),
		'',
		MARKER(prNumber)
	].join('\n');
}

export function deployingComment(
	prNumber: number,
	sha: string,
	images: Record<PreviewApp, ImageStatus>
): string {
	return [
		'### Nexo Preview',
		'',
		`**Status:** 🚀 Deploying \`${sha.slice(0, 7)}\` to VPS…`,
		'',
		imageChecklist(images, prNumber),
		'',
		MARKER(prNumber)
	].join('\n');
}

export function deployedComment(prNumber: number, sha: string): string {
	return [
		'### Nexo Preview',
		'',
		`**Status:** ✅ Live @ \`${sha.slice(0, 7)}\``,
		'',
		PREVIEW_URL_TABLE,
		'',
		'- [ ] Redeploy',
		'',
		MARKER(prNumber)
	].join('\n');
}

export function failedComment(
	prNumber: number,
	sha: string,
	runUrl: string,
	reason?: string
): string {
	return [
		'### Nexo Preview',
		'',
		`**Status:** ❌ Deploy failed @ \`${sha.slice(0, 7)}\`${reason ? ` — ${reason}` : ''} — [view run](${runUrl})`,
		'',
		'- [ ] Retry deploy',
		'',
		MARKER(prNumber)
	].join('\n');
}

export function staleComment(prNumber: number, liveSha: string, newSha: string): string {
	return [
		'### Nexo Preview',
		'',
		`**Status:** ⚠️ Stale — \`${liveSha.slice(0, 7)}\` is live, PR is now at \`${newSha.slice(0, 7)}\``,
		'',
		'- [ ] Deploy latest commit to preview',
		'',
		MARKER(prNumber)
	].join('\n');
}

export function timedOutComment(prNumber: number, sha: string, missing: PreviewApp[]): string {
	const list = missing.map((app) => `\`nexo-${app}:pr-${prNumber}\``).join(', ');
	return [
		'### Nexo Preview',
		'',
		`**Status:** ❌ Timed out waiting for images @ \`${sha.slice(0, 7)}\` — missing: ${list}`,
		'',
		'- [ ] Retry deploy',
		'',
		MARKER(prNumber)
	].join('\n');
}
