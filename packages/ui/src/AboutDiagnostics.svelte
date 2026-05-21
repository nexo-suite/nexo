<script lang="ts">
	import { dev } from '$app/environment';
	import { Copy, ExternalLink, AlertTriangle, Check, ChevronDown } from '@lucide/svelte';
	import {
		diagnostics,
		buildDiagnosticsBundle,
		buildDiagnosticsSummary,
		buildBugReportUrl,
		type DiagError
	} from './diagnostics.svelte.js';

	type Props = {
		appName: string;
		appKey: string;
		version: string;
		commit?: string;
		buildTime?: string;
		email?: string | null;
		userId?: string | null;
		correlationId?: string | null;
		repoUrl?: string;
		sectionTitle?: string;
	};

	let {
		appName,
		appKey,
		version,
		commit,
		buildTime,
		email = null,
		userId = null,
		correlationId = null,
		repoUrl = 'https://github.com/nexo-suite/nexo',
		sectionTitle: _sectionTitle = 'About'
	}: Props = $props();

	let open = $state(false);
	let copied = $state(false);

	const env = $derived(dev ? 'dev' : 'prod');
	const errors = $derived<DiagError[]>(diagnostics.errors);
	const userAgent = $derived(typeof navigator !== 'undefined' ? navigator.userAgent : undefined);
	const url = $derived(typeof window !== 'undefined' ? window.location.href : undefined);
	const buildTimeShort = $derived(buildTime ? buildTime.slice(0, 16).replace('T', ' ') : null);

	function detectDevice(
		ua: string | undefined
	):
		| 'iPhone (PWA installed)'
		| 'iPhone (Safari)'
		| 'Android (PWA installed)'
		| 'Android (Chrome / Firefox)'
		| 'Desktop (Chrome / Firefox / Safari / Edge)'
		| 'Other' {
		if (!ua || typeof window === 'undefined') return 'Other';
		const standalone =
			window.matchMedia?.('(display-mode: standalone)').matches ||
			(navigator as unknown as { standalone?: boolean }).standalone === true;
		if (/iPhone|iPad|iPod/.test(ua))
			return standalone ? 'iPhone (PWA installed)' : 'iPhone (Safari)';
		if (/Android/.test(ua))
			return standalone ? 'Android (PWA installed)' : 'Android (Chrome / Firefox)';
		if (/Mac|Windows|Linux|CrOS/.test(ua)) return 'Desktop (Chrome / Firefox / Safari / Edge)';
		return 'Other';
	}

	const device = $derived(detectDevice(userAgent));

	const summary = $derived.by(() => {
		const bits = [`v${version}`];
		if (errors.length > 0) bits.push(`${errors.length} error${errors.length === 1 ? '' : 's'}`);
		else bits.push('no errors');
		return bits.join(' · ');
	});

	function bundle(): string {
		return buildDiagnosticsBundle({
			appName,
			version,
			commit,
			buildTime,
			email,
			userId,
			correlationId,
			userAgent,
			url,
			errors
		});
	}

	async function onCopy() {
		try {
			await navigator.clipboard.writeText(bundle());
			copied = true;
			setTimeout(() => (copied = false), 1800);
		} catch {
			copied = false;
		}
	}

	const issueUrl = $derived.by(() => {
		const knownApps = ['finance', 'admin', 'auth', 'landing', 'flaschen'] as const;
		const app: string = (knownApps as readonly string[]).includes(appKey)
			? appKey
			: 'other / not sure';
		const reportCid = errors[0]?.correlationId ?? correlationId ?? null;
		const summary = buildDiagnosticsSummary({
			version,
			commit,
			url,
			correlationId: reportCid,
			errors
		});
		return buildBugReportUrl(repoUrl, {
			app,
			device,
			correlationId: reportCid,
			whatHappened: summary
		});
	});

	function fmtRelative(iso: string): string {
		const ms = Date.now() - new Date(iso).getTime();
		if (ms < 0) return iso;
		const s = Math.round(ms / 1000);
		if (s < 60) return `${s}s ago`;
		const min = Math.round(s / 60);
		if (min < 60) return `${min}m ago`;
		const h = Math.round(min / 60);
		if (h < 24) return `${h}h ago`;
		return `${Math.round(h / 24)}d ago`;
	}
</script>

<details class="ad" bind:open>
	<summary class="ad-summary">
		<span class="ad-summary-text">
			<span class="ad-name">{appName}</span>
			<span class="ad-meta">{summary}</span>
		</span>
		<span class="ad-pill" class:ad-pill-dev={env === 'dev'}>{env}</span>
		<span class="ad-chev"><ChevronDown size={15} strokeWidth={1.8} /></span>
	</summary>

	<div class="ad-body">
		<dl class="ad-grid">
			<dt>Build</dt>
			<dd class="mono">
				{commit ?? 'dev'}{#if buildTimeShort}
					· {buildTimeShort}{/if}
			</dd>
			{#if email || userId}
				<dt>User</dt>
				<dd>{email ?? userId}</dd>
			{/if}
			{#if correlationId}
				<dt>Correlation</dt>
				<dd class="mono">{correlationId}</dd>
			{/if}
		</dl>

		{#if errors.length > 0}
			<ul class="ad-errors">
				{#each errors as err, i (i)}
					<li class="ad-err">
						<AlertTriangle size={12} strokeWidth={2} />
						<span class="ad-err-msg">{err.message}</span>
						{#if err.correlationId}
							<span class="ad-err-cid mono">{err.correlationId}</span>
						{/if}
						<span class="ad-err-time mono">{fmtRelative(err.timestamp)}</span>
					</li>
				{/each}
			</ul>
		{/if}

		<div class="ad-actions">
			<button type="button" class="ad-btn" onclick={onCopy} disabled={copied}>
				{#if copied}
					<Check size={13} strokeWidth={2} />
					<span>Copied</span>
				{:else}
					<Copy size={13} strokeWidth={1.8} />
					<span>Copy diagnostics</span>
				{/if}
			</button>
			<a class="ad-btn ad-btn-ghost" href={issueUrl} target="_blank" rel="noreferrer">
				<ExternalLink size={13} strokeWidth={1.8} />
				<span>Report</span>
			</a>
		</div>
	</div>
</details>

<style>
	.ad {
		margin-top: 14px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-subtle, var(--border-subtle));
		border-radius: var(--radius-lg, 14px);
		overflow: hidden;
	}

	.ad-summary {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 14px;
		cursor: pointer;
		list-style: none;
		user-select: none;
	}

	.ad-summary::-webkit-details-marker {
		display: none;
	}

	.ad-summary:active {
		background: var(--color-surface-2, var(--color-bg-1));
	}

	.ad-summary-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	.ad-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.ad-meta {
		font-size: 11.5px;
		color: var(--color-text-subtle);
		font-family: var(--font-mono);
		letter-spacing: 0.02em;
	}

	.ad-pill {
		display: inline-flex;
		align-items: center;
		padding: 1px 7px;
		font-family: var(--font-mono);
		font-size: 9.5px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		border-radius: 999px;
		background: color-mix(in oklab, var(--color-text-faint, #a1a1aa) 14%, transparent);
		color: var(--color-text-muted, var(--text-muted));
		flex-shrink: 0;
	}

	.ad-pill-dev {
		background: color-mix(in oklab, var(--warn, #ca8a04) 16%, transparent);
		color: color-mix(in oklab, var(--warn, #ca8a04) 80%, #000);
	}

	.ad-chev {
		flex-shrink: 0;
		color: var(--color-text-faint);
		display: inline-flex;
		transition: transform var(--duration-fast, 150ms) var(--ease-out, ease-out);
	}

	.ad[open] .ad-chev {
		transform: rotate(180deg);
	}

	.ad-body {
		padding: 0 14px 12px;
		border-top: 1px solid var(--color-border-subtle, var(--border-subtle));
	}

	.ad-grid {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 6px 12px;
		margin: 12px 0 0;
		font-size: 12px;
	}

	.ad-grid dt {
		font-family: var(--font-mono);
		font-size: 10.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-faint, var(--text-faint));
		align-self: center;
	}

	.ad-grid dd {
		margin: 0;
		color: var(--color-text-primary);
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mono {
		font-family: var(--font-mono);
		font-size: 11.5px;
		letter-spacing: 0.02em;
	}

	.ad-errors {
		list-style: none;
		padding: 0;
		margin: 12px 0 0;
		border-top: 1px dashed var(--color-border-subtle, var(--border-subtle));
		padding-top: 10px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.ad-err {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--color-text-primary);
	}

	.ad-err :global(svg) {
		color: var(--err, #dc2626);
		flex-shrink: 0;
	}

	.ad-err-msg {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ad-err-time {
		color: var(--color-text-faint);
		font-size: 10.5px;
		flex-shrink: 0;
	}

	.ad-err-cid {
		color: var(--color-text-faint);
		font-size: 10.5px;
		flex-shrink: 0;
		padding: 1px 5px;
		border-radius: 4px;
		background: var(--color-bg-1, var(--color-bg-2));
	}

	.ad-actions {
		display: flex;
		gap: 6px;
		margin-top: 12px;
	}

	.ad-btn {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		height: 32px;
		padding: 0 10px;
		font: inherit;
		font-size: 12px;
		font-weight: 500;
		border-radius: var(--radius-md, 10px);
		border: 1px solid var(--color-border-default, var(--border-default));
		background: var(--color-surface-1);
		color: var(--color-text-primary);
		cursor: pointer;
		text-decoration: none;
	}

	.ad-btn:active {
		background: var(--color-bg-1);
	}

	.ad-btn:disabled {
		opacity: 0.65;
		cursor: default;
	}

	.ad-btn-ghost {
		color: var(--color-text-subtle);
	}
</style>
