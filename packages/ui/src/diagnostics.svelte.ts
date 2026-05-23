// Lightweight client-side diagnostics: a 5-slot ring buffer of recent errors,
// surfaced in the AboutDiagnostics card so users can copy a useful bundle when
// reporting issues. Persists to sessionStorage so a refresh doesn't blow it away.

export type DiagError = {
	message: string;
	stack?: string;
	source?: string;
	timestamp: string;
	correlationId?: string;
};

const MAX_ERRORS = 5;
let errors = $state<DiagError[]>([]);
let installedKey: string | null = null;
let currentCorrelationId: string | null = null;

export function setCurrentCorrelationId(id: string | null): void {
	currentCorrelationId = id;
}

function storageKey(appKey: string): string {
	return `nexo:diag:${appKey}`;
}

function loadFromStorage(appKey: string): DiagError[] {
	if (typeof sessionStorage === 'undefined') return [];
	try {
		const raw = sessionStorage.getItem(storageKey(appKey));
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.slice(0, MAX_ERRORS);
	} catch {
		return [];
	}
}

function saveToStorage(appKey: string, list: DiagError[]): void {
	if (typeof sessionStorage === 'undefined') return;
	try {
		sessionStorage.setItem(storageKey(appKey), JSON.stringify(list));
	} catch {
		// Quota / disabled storage — drop silently.
	}
}

export function addDiagnosticError(
	appKey: string,
	err: { message: string; stack?: string; source?: string }
): void {
	const entry: DiagError = {
		message: err.message?.slice(0, 500) ?? 'Unknown error',
		stack: err.stack?.slice(0, 2000),
		source: err.source,
		timestamp: new Date().toISOString(),
		correlationId: currentCorrelationId ?? undefined
	};
	const next = [entry, ...errors].slice(0, MAX_ERRORS);
	errors = next;
	saveToStorage(appKey, next);
}

export function clearDiagnostics(appKey: string): void {
	errors = [];
	if (typeof sessionStorage === 'undefined') return;
	try {
		sessionStorage.removeItem(storageKey(appKey));
	} catch {
		// noop
	}
}

export const diagnostics = {
	get errors(): DiagError[] {
		return errors;
	}
};

export function installDiagnostics(appKey: string): void {
	if (typeof window === 'undefined') return;
	if (installedKey === appKey) return;
	installedKey = appKey;

	errors = loadFromStorage(appKey);

	window.addEventListener('error', (ev: ErrorEvent) => {
		const error = ev.error;
		addDiagnosticError(appKey, {
			message: ev.message || (error instanceof Error ? error.message : String(error ?? 'error')),
			stack: error instanceof Error ? error.stack : undefined,
			source: 'window.error'
		});
	});

	window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
		const reason = ev.reason;
		addDiagnosticError(appKey, {
			message: reason instanceof Error ? reason.message : String(reason ?? 'rejection'),
			stack: reason instanceof Error ? reason.stack : undefined,
			source: 'unhandledrejection'
		});
	});
}

export function buildDiagnosticsBundle(opts: {
	appName: string;
	version: string;
	commit?: string;
	buildTime?: string;
	email?: string | null;
	userId?: string | null;
	correlationId?: string | null;
	userAgent?: string;
	url?: string;
	useUnstable?: boolean;
	errors?: DiagError[];
}): string {
	const lines: string[] = [];
	lines.push(`### ${opts.appName} diagnostics`);
	lines.push('');
	lines.push(`- **version**: \`${opts.version}\``);
	if (opts.commit) lines.push(`- **commit**: \`${opts.commit}\``);
	if (opts.buildTime) lines.push(`- **built**: \`${opts.buildTime}\``);
	lines.push(`- **captured**: \`${new Date().toISOString()}\``);
	if (opts.url) lines.push(`- **url**: \`${opts.url}\``);
	if (opts.useUnstable) lines.push(`- **unstable**: \`on\``);
	lines.push('');
	lines.push('**Session**');
	if (opts.email) lines.push(`- email: \`${opts.email}\``);
	if (opts.userId) lines.push(`- userId: \`${opts.userId}\``);
	if (opts.correlationId) lines.push(`- correlationId: \`${opts.correlationId}\``);
	if (opts.userAgent) lines.push(`- userAgent: \`${opts.userAgent}\``);

	const errs = opts.errors ?? [];
	lines.push('');
	lines.push(`**Recent errors** (${errs.length})`);
	if (errs.length === 0) {
		lines.push('');
		lines.push('_none_');
	} else {
		for (const e of errs) {
			lines.push('');
			const cid = e.correlationId ? ` · cid: \`${e.correlationId}\`` : '';
			lines.push(`- \`${e.timestamp}\` · ${e.source ?? 'error'}${cid}`);
			lines.push(`  ${e.message.replace(/\n/g, ' ')}`);
			if (e.stack) {
				const head = e.stack.split('\n').slice(0, 3);
				for (const frame of head) {
					lines.push(`      ${frame.trim()}`);
				}
			}
		}
	}
	return lines.join('\n');
}

export function buildDiagnosticsSummary(opts: {
	version: string;
	commit?: string;
	url?: string;
	correlationId?: string | null;
	useUnstable?: boolean;
	errors?: DiagError[];
}): string {
	const lines: string[] = [];
	lines.push(`version: ${opts.version}${opts.commit ? ` (${opts.commit})` : ''}`);
	if (opts.url) lines.push(`url: ${opts.url}`);
	if (opts.correlationId) lines.push(`correlation: ${opts.correlationId}`);
	if (opts.useUnstable) lines.push('unstable: on');
	const errs = opts.errors ?? [];
	if (errs.length > 0) {
		lines.push('');
		lines.push(`recent errors (${errs.length}):`);
		for (const e of errs) {
			const msg = e.message.replace(/\s+/g, ' ').slice(0, 200);
			const cid = e.correlationId ? ` [${e.correlationId}]` : '';
			lines.push(`- ${msg}${cid}`);
		}
	}
	lines.push('');
	lines.push('(full diagnostics in clipboard via "Copy diagnostics")');
	return lines.join('\n');
}

export function buildIssueUrl(repoUrl: string, title: string, body: string): string {
	const base = repoUrl.replace(/\/$/, '');
	const params = new URLSearchParams({ title, body });
	return `${base}/issues/new?${params.toString()}`;
}

// Prefill the bug_report.yml issue form. Field IDs come from .github/ISSUE_TEMPLATE/bug_report.yml.
// `app` and `device` are plain text inputs (dropdowns aren't reliably prefillable via URL).
export function buildBugReportUrl(
	repoUrl: string,
	fields: {
		app: string;
		device?: string;
		correlationId?: string | null;
		whatHappened?: string;
	}
): string {
	const base = repoUrl.replace(/\/$/, '');
	const params = new URLSearchParams({ template: 'bug_report.yml' });
	params.set('app', fields.app);
	if (fields.device) params.set('device', fields.device);
	if (fields.correlationId) params.set('correlation-id', fields.correlationId);
	if (fields.whatHappened) params.set('what-happened', fields.whatHappened);
	return `${base}/issues/new?${params.toString()}`;
}
