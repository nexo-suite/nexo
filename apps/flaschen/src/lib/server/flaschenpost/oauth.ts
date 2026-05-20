import { browserHeaders } from './headers';
import { flaschenpostEnv } from './env';

const TOKEN_URL = 'https://fauth.flaschenpost.de/oauth2/token';

export class OAuthError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly body: string
	) {
		super(message);
		this.name = 'OAuthError';
	}

	get isInvalidGrant(): boolean {
		try {
			const parsed = JSON.parse(this.body) as { error?: string };
			return parsed.error === 'invalid_grant';
		} catch {
			return false;
		}
	}
}

export type ParsedTokens = {
	accessToken: string;
	refreshToken: string;
	expiresAt: Date;
	refreshExpiresAt: Date | null;
	employeeId: string | null;
	scope: string | null;
};

function clientId(): string {
	const id = flaschenpostEnv().FLASCHEN_OAUTH_CLIENT_ID;
	if (!id) throw new Error('FLASCHEN_OAUTH_CLIENT_ID is not set');
	return id;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
	const parts = token.split('.');
	if (parts.length !== 3) return null;
	try {
		const padded = parts[1] + '='.repeat((4 - (parts[1].length % 4)) % 4);
		const json = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
			'utf8'
		);
		return JSON.parse(json) as Record<string, unknown>;
	} catch {
		return null;
	}
}

function parseTokenResponse(payload: unknown): ParsedTokens {
	const p = payload as Record<string, unknown>;
	const accessToken = String(p.access_token ?? '');
	const refreshToken = String(p.refresh_token ?? '');
	const expiresIn = Number(p.expires_in ?? 0);
	if (!accessToken || !refreshToken) throw new Error('token response missing access/refresh token');

	const idToken = typeof p.id_token === 'string' ? p.id_token : null;
	const claims = idToken ? decodeJwtPayload(idToken) : decodeJwtPayload(accessToken);
	const employeeId = claims
		? String(
				(claims.employee_id as string | undefined) ??
					(claims.employeeId as string | undefined) ??
					(claims.sub as string | undefined) ??
					''
			) || null
		: null;

	return {
		accessToken,
		refreshToken,
		expiresAt: new Date(Date.now() + expiresIn * 1000),
		refreshExpiresAt: extractRefreshExpiry(refreshToken, p),
		employeeId,
		scope: typeof p.scope === 'string' ? p.scope : null
	};
}

function extractRefreshExpiry(refreshToken: string, payload: Record<string, unknown>): Date | null {
	const ttl = Number(payload.refresh_expires_in ?? 0);
	if (ttl > 0) return new Date(Date.now() + ttl * 1000);

	const claims = decodeJwtPayload(refreshToken);
	if (!claims) return null;
	const exp = claims.exp;
	if (typeof exp === 'number' && exp > 0) return new Date(exp * 1000);
	return null;
}

async function postForm(body: URLSearchParams): Promise<ParsedTokens> {
	const res = await fetch(TOKEN_URL, {
		method: 'POST',
		body,
		headers: browserHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
	});
	const text = await res.text();
	if (!res.ok) throw new OAuthError(`token endpoint returned ${res.status}`, res.status, text);
	return parseTokenResponse(JSON.parse(text));
}

export async function refreshGrant(refreshToken: string): Promise<ParsedTokens> {
	return postForm(
		new URLSearchParams({
			grant_type: 'refresh_token',
			client_id: clientId(),
			refresh_token: refreshToken
		})
	);
}
