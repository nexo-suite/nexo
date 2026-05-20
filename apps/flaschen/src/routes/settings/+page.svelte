<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { untrack } from 'svelte';
	import {
		BottomSheet,
		PageHeader,
		ProfileHubCard,
		SaveBar,
		SectionLabel,
		Toggle,
		UnsavedGuard
	} from '@nexo/ui';
	import { AlertTriangle, ChevronRight, ExternalLink, Copy } from '@lucide/svelte';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';

	let { data, form } = $props();

	let connectOpen = $state(false);
	let connecting = $state(false);
	let quietHoursEnabled = $state(untrack(() => data.quietHours.enabled));
	let quietStart = $state(untrack(() => minutesToTime(data.quietHours.startMinutes)));
	let quietEnd = $state(untrack(() => minutesToTime(data.quietHours.endMinutes)));
	let quietSaving = $state(false);
	let diagnosticsCopied = $state(false);

	const appVersion = __APP_VERSION__;
	const sourceUrl = 'https://github.com/krieger2501/nexo';

	function minutesToTime(mins: number): string {
		const h = Math.floor(mins / 60);
		const mm = mins % 60;
		return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
	}

	const quietDirty = $derived(
		quietHoursEnabled !== data.quietHours.enabled ||
			quietStart !== minutesToTime(data.quietHours.startMinutes) ||
			quietEnd !== minutesToTime(data.quietHours.endMinutes)
	);

	function discardQuiet() {
		quietHoursEnabled = data.quietHours.enabled;
		quietStart = minutesToTime(data.quietHours.startMinutes);
		quietEnd = minutesToTime(data.quietHours.endMinutes);
	}

	async function copyDiagnostics() {
		const correlationId =
			typeof crypto !== 'undefined' && 'randomUUID' in crypto
				? crypto.randomUUID().slice(0, 8)
				: Math.random().toString(36).slice(2, 10);
		const payload = [
			`flaschen v${appVersion}`,
			`correlationId: ${correlationId}`,
			`ua: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a'}`,
			`when: ${new Date().toISOString()}`
		].join('\n');
		try {
			await navigator.clipboard.writeText(payload);
			diagnosticsCopied = true;
			setTimeout(() => (diagnosticsCopied = false), 1800);
		} catch {
			// silently ignore clipboard failures
		}
	}

	// Open the connect sheet automatically when arriving from the home CTA
	// (`/settings?connect=1`). Strip the query so reloads don't re-open it.
	$effect(() => {
		if (page.url.searchParams.get('connect') === '1') {
			connectOpen = true;
			const url = new URL(page.url);
			url.searchParams.delete('connect');
			void goto(url.pathname + url.search, { replaceState: true, noScroll: true });
		}
	});

	const hubUrl = env.PUBLIC_LANDING_URL
		? `${env.PUBLIC_LANDING_URL}/apps`
		: 'https://krieger2501.de/apps';

	const languageLabels: Record<string, string> = {
		auto: 'Auto',
		en: 'English',
		de: 'Deutsch',
		tr: 'Türkçe'
	};
	const themeLabels: Record<string, string> = {
		system: 'System',
		light: 'Light',
		dark: 'Dark'
	};
	const weekStartLabels: Record<string, string> = {
		monday: 'Monday',
		sunday: 'Sunday',
		saturday: 'Saturday'
	};

	const accountStatus = $derived.by(() => {
		if (!data.account) return 'never' as const;
		if (data.account.needsReconnect) return 'reconnect' as const;
		return 'connected' as const;
	});

	const lastRefreshed = $derived(formatRelative(data.account?.lastLoginAt ?? null));
	const tokenExpiresLabel = $derived(formatExpires(data.account?.refreshTokenExpiresAt ?? null));

	function formatRelative(d: Date | string | null): string | null {
		if (!d) return null;
		const ms = Date.now() - new Date(d).getTime();
		const min = Math.round(ms / 60000);
		if (min < 1) return 'just now';
		if (min < 60) return `${min} min ago`;
		const h = Math.round(min / 60);
		if (h < 24) return `${h} h ago`;
		return `${Math.round(h / 24)} d ago`;
	}

	function formatExpires(d: Date | string | null): string | null {
		if (!d) return null;
		const ms = new Date(d).getTime() - Date.now();
		if (ms <= 0) return 'expired';
		const min = Math.round(ms / 60000);
		if (min < 60) return `in ${min} min`;
		const h = Math.round(min / 60);
		if (h < 48) return `in ${h} h`;
		const days = Math.round(h / 24);
		if (days < 60) return `in ${days} d`;
		return `in ${Math.round(days / 30)} mo`;
	}
</script>

<div class="page">
	<PageHeader title={m.nav_settings()} subtitle="Account, profile, and the Flaschenpost link.">
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
	</PageHeader>

	{#if accountStatus === 'reconnect'}
		<div class="banner banner-err">
			<AlertTriangle size={18} strokeWidth={1.8} />
			<span>{m.settings_needs_reconnect()}</span>
			<button type="button" onclick={() => (connectOpen = true)}>{m.settings_reconnect()}</button>
		</div>
	{/if}

	<ProfileHubCard
		name={data.profile.name}
		email={data.profile.email}
		{hubUrl}
		displayName={data.profile.displayName}
		language={languageLabels[data.profile.language] ?? data.profile.language}
		weekStarts={weekStartLabels[data.profile.weekStartDay] ?? 'Monday'}
		theme={themeLabels[data.profile.theme] ?? data.profile.theme}
	/>

	<!-- ─── Account ─── -->
	{#if accountStatus === 'connected'}
		<SectionLabel title={m.settings_account()} subtitle="Flaschenpost link" right="connected" />
	{:else if accountStatus === 'reconnect'}
		<SectionLabel
			title={m.settings_account()}
			subtitle="Flaschenpost link"
			right="expired"
			rightTone="error"
		/>
	{:else}
		<SectionLabel title={m.settings_account()} subtitle="Flaschenpost link" right="not linked" />
	{/if}
	<div class="set-card">
		{#if accountStatus === 'never'}
			<button type="button" class="set-row" onclick={() => (connectOpen = true)}>
				<div class="sr-icon sr-icon-accent">→</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_connect()}</div>
					<div class="sr-desc">We'll keep an encrypted refresh token, never your password.</div>
				</div>
				<span class="sr-chev"><ChevronRight size={16} strokeWidth={1.8} /></span>
			</button>
		{:else}
			<div class="set-row" style="cursor: default">
				<div
					class="sr-icon"
					class:sr-icon-ok={accountStatus === 'connected'}
					class:sr-icon-err={accountStatus === 'reconnect'}
				>
					{accountStatus === 'connected' ? '✓' : '!'}
				</div>
				<div class="sr-text">
					<div class="sr-label">
						{accountStatus === 'reconnect' ? m.settings_needs_reconnect() : m.settings_connected()}
					</div>
					<div class="sr-desc">
						{m.settings_employee_id()}: {data.account?.employeeId}{#if lastRefreshed}
							· {m.settings_last_refreshed()}: {lastRefreshed}{/if}{#if tokenExpiresLabel}
							· {m.settings_token_expires()} {tokenExpiresLabel}{/if}
					</div>
				</div>
			</div>
			{#if accountStatus === 'reconnect'}
				<button type="button" class="set-row" onclick={() => (connectOpen = true)}>
					<div class="sr-icon sr-icon-accent">↻</div>
					<div class="sr-text">
						<div class="sr-label">{m.settings_reconnect()}</div>
					</div>
					<span class="sr-chev"><ChevronRight size={16} strokeWidth={1.8} /></span>
				</button>
			{/if}
			<form method="POST" action="?/disconnect" use:enhance class="disconnect-form">
				<button type="submit" class="set-row danger-row">
					<div class="sr-icon sr-icon-danger">⎋</div>
					<div class="sr-text">
						<div class="sr-label">{m.settings_disconnect()}</div>
						<div class="sr-desc">Revokes our refresh token and stops watching.</div>
					</div>
					<span class="sr-chev"><ChevronRight size={16} strokeWidth={1.8} /></span>
				</button>
			</form>
		{/if}
	</div>

	<!-- ─── Quiet hours ─── -->
	<SectionLabel title={m.settings_quiet_hours()} />
	<form
		id="quiet-form"
		method="POST"
		action="?/quietHours"
		use:enhance={() => {
			quietSaving = true;
			return async ({ update }) => {
				await update({ reset: false });
				quietSaving = false;
			};
		}}
		class="set-card quiet-card"
	>
		<div class="set-row" style="cursor: default">
			<div class="sr-icon sr-icon-accent">🌙</div>
			<div class="sr-text">
				<div class="sr-label">{m.settings_quiet_hours_label()}</div>
				<div class="sr-desc">{m.settings_quiet_hours_desc()}</div>
			</div>
			<div class="sr-toggle">
				<Toggle bind:checked={quietHoursEnabled} ariaLabel={m.settings_quiet_hours_label()} />
			</div>
		</div>
		<input type="hidden" name="enabled" value={quietHoursEnabled ? 'on' : 'off'} />
		<div class="quiet-range" class:disabled={!quietHoursEnabled}>
			<label class="quiet-field">
				<span class="quiet-field-label">{m.settings_quiet_hours_start()}</span>
				<input
					type="time"
					name="startTime"
					bind:value={quietStart}
					step="300"
					disabled={!quietHoursEnabled}
				/>
			</label>
			<span class="quiet-dash" aria-hidden="true">→</span>
			<label class="quiet-field">
				<span class="quiet-field-label">{m.settings_quiet_hours_end()}</span>
				<input
					type="time"
					name="endTime"
					bind:value={quietEnd}
					step="300"
					disabled={!quietHoursEnabled}
				/>
			</label>
		</div>
	</form>

	<!-- ─── About ─── -->
	<SectionLabel title={m.settings_about()} right="v{appVersion}" />
	<div class="set-card">
		<a class="set-row" href={sourceUrl} target="_blank" rel="noreferrer">
			<div class="sr-icon">🐙</div>
			<div class="sr-text">
				<div class="sr-label">{m.settings_about_source()}</div>
				<div class="sr-desc">{sourceUrl.replace('https://', '')}</div>
			</div>
			<span class="sr-chev"><ExternalLink size={14} strokeWidth={1.8} /></span>
		</a>
		<button type="button" class="set-row" onclick={copyDiagnostics}>
			<div class="sr-icon">📋</div>
			<div class="sr-text">
				<div class="sr-label">{m.settings_about_diagnostics()}</div>
				<div class="sr-desc">
					{diagnosticsCopied ? m.settings_about_copied() : m.settings_about_diagnostics_desc()}
				</div>
			</div>
			<span class="sr-chev"><Copy size={14} strokeWidth={1.8} /></span>
		</button>
	</div>
</div>

<SaveBar
	visible={quietDirty}
	hint={m.unsaved_title()}
	label={quietSaving ? m.settings_saving() : m.settings_save()}
	formId="quiet-form"
/>

<!-- ─── Connect sheet ─── -->
<BottomSheet bind:open={connectOpen} title={m.settings_connect()} subtitle={m.connect_disclaimer()}>
	{@const connectError =
		form?.error === 'INVALID_TOKEN' ||
		form?.error === 'MISSING_TOKEN' ||
		form?.error === 'CONNECT_FAILED' ||
		form?.error === 'NO_EMPLOYEE_ID'}
	<form
		method="POST"
		action="?/connect"
		use:enhance={() => {
			connecting = true;
			return async ({ update, result }) => {
				await update({ reset: false });
				connecting = false;
				if (result.type === 'success') connectOpen = false;
			};
		}}
	>
		<p class="connect-help-intro">{m.connect_help_intro()}</p>
		<ol class="connect-help-steps">
			<li>{m.connect_help_step_1()}</li>
			<li>{m.connect_help_step_2()}</li>
			<li>{m.connect_help_step_3()}</li>
			<li>{m.connect_help_step_4()}</li>
		</ol>
		<label class="field">
			<span class="field-label">{m.connect_token_label()}</span>
			<textarea
				name="refreshToken"
				rows="4"
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
				placeholder={m.connect_token_placeholder()}
				aria-invalid={connectError || undefined}
				class:invalid={connectError}
				required
			></textarea>
		</label>
		<div class="field-error-slot" aria-live="polite">
			{#if form?.error === 'INVALID_TOKEN'}
				<div class="field-error">{m.err_invalid_token()}</div>
			{:else if form?.error === 'MISSING_TOKEN'}
				<div class="field-error">{m.err_missing_token()}</div>
			{:else if form?.error === 'CONNECT_FAILED' || form?.error === 'NO_EMPLOYEE_ID'}
				<div class="field-error">{m.err_connect_failed()}</div>
			{/if}
		</div>
		<div class="sheet-actions sheet-actions-row">
			<button type="button" class="sheet-cancel" onclick={() => (connectOpen = false)}>
				{m.connect_cancel()}
			</button>
			<button type="submit" class="sheet-done" disabled={connecting}>{m.connect_submit()}</button>
		</div>
	</form>
</BottomSheet>

<!-- Unsaved changes guard -->
<UnsavedGuard
	dirty={quietDirty}
	formId="quiet-form"
	onDiscard={discardQuiet}
	title={m.unsaved_title()}
	description={m.unsaved_desc()}
	saveLabel={m.unsaved_save()}
	discardLabel={m.unsaved_discard()}
/>

<style>
	.banner button {
		margin-left: auto;
		font-size: 12px;
		font-weight: 600;
		background: none;
		border: none;
		color: inherit;
		text-decoration: underline;
		cursor: pointer;
	}

	:global(.set-row .sr-icon.sr-icon-accent) {
		background: color-mix(in oklab, var(--color-accent) 12%, var(--color-bg-1));
		color: var(--color-accent);
	}
	:global(.set-row .sr-icon.sr-icon-ok) {
		background: color-mix(in oklab, var(--ok) 14%, var(--color-bg-1));
		color: var(--ok);
	}
	:global(.set-row .sr-icon.sr-icon-err) {
		background: color-mix(in oklab, var(--err) 14%, var(--color-bg-1));
		color: var(--err);
	}
	:global(.set-row .sr-icon.sr-icon-danger) {
		background: color-mix(in oklab, var(--err) 10%, var(--color-bg-1));
		color: var(--err);
	}

	.disconnect-form {
		display: contents;
	}
	.danger-row .sr-label {
		color: var(--err);
	}

	/* ─── Quiet hours range ─── */
	.quiet-card {
		display: block;
	}
	.quiet-range {
		display: flex;
		align-items: flex-end;
		gap: 10px;
		padding: 12px 16px 16px;
		border-top: 1px solid var(--color-border-subtle, var(--border-subtle));
	}
	.quiet-range.disabled {
		opacity: 0.5;
	}
	.quiet-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		flex: 1;
		min-width: 0;
	}
	.quiet-field-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text-subtle);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.quiet-field input[type='time'] {
		width: 100%;
		padding: 10px 12px;
		font: inherit;
		font-size: 14px;
		font-variant-numeric: tabular-nums;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md, 12px);
		background: var(--color-surface-1);
		color: var(--color-text);
	}
	.quiet-dash {
		padding-bottom: 12px;
		font-size: 14px;
		color: var(--color-text-subtle);
		flex-shrink: 0;
	}

	/* ─── Field (forms) ─── */
	.field {
		display: block;
		margin-bottom: 14px;
	}
	.field-label {
		display: block;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text-subtle);
		margin-bottom: 6px;
	}
	.field textarea {
		width: 100%;
		padding: 12px;
		font: inherit;
		font-size: 13px;
		font-family:
			ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
		line-height: 1.4;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md, 12px);
		background: var(--color-surface-1);
		resize: vertical;
		word-break: break-all;
	}
	.field textarea.invalid,
	.field textarea[aria-invalid='true'] {
		border-color: var(--err);
		box-shadow: 0 0 0 1px var(--err);
	}
	.connect-help-intro {
		font-size: 13px;
		line-height: 1.45;
		color: var(--color-text-subtle);
		margin: 0 0 10px;
	}
	.connect-help-steps {
		font-size: 13px;
		line-height: 1.5;
		color: var(--color-text-subtle);
		margin: 0 0 16px;
		padding-left: 20px;
	}
	.connect-help-steps li {
		margin-bottom: 4px;
	}
	.field-error-slot {
		min-height: 20px;
		margin: -6px 0 8px;
	}
	.field-error {
		font-size: 13px;
		color: var(--err);
	}

	/* ─── Sheet actions ─── */
	.sheet-actions {
		padding: 14px 0 4px;
	}
	.sheet-actions-row {
		display: flex;
		gap: 8px;
	}
	.sheet-done {
		flex: 1;
		width: 100%;
		height: 48px;
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		border-radius: var(--radius-md, 12px);
		border: none;
		background: var(--color-accent);
		color: #fff;
		cursor: pointer;
		transition: opacity 150ms ease;
	}
	.sheet-done:active:not(:disabled) {
		opacity: 0.85;
	}
	.sheet-done:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.sheet-cancel {
		flex: 1;
		height: 48px;
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		border-radius: var(--radius-md, 12px);
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-1);
		color: var(--color-text);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}
</style>
