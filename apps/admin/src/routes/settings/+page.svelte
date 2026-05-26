<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { env } from '$env/dynamic/public';
	import { dev } from '$app/environment';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import {
		AboutDiagnostics,
		BottomSheet,
		DeviceListRow,
		ErrorBanner,
		PageHeader,
		ProfileHubCard,
		SectionLabel
	} from '@nexo/ui';
	import { parseUserAgent, deviceIcon } from '@nexo/ui/utils/ua-parser';
	import { formatRelative, defaultLabelFromUA } from '@nexo/ui/utils/format-relative';
	import {
		enableNotifications,
		disableNotifications,
		getPermissionState,
		getCurrentSubscription,
		sendTest,
		isStandalone,
		type PermissionState
	} from '@nexo/push/client';
	import { Bell, BellOff, Send, Trash2, Pencil } from '@lucide/svelte';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';
	import { settings, persistSettings } from '$lib/settings.svelte';

	let { data } = $props();

	$effect(() => {
		void settings.logDark;
		void settings.logWrap;
		void settings.logDensity;
		void settings.timeMode;
		persistSettings();
	});

	const densityOptions: Array<{ value: typeof settings.logDensity; label: string }> = $derived([
		{ value: 'compact', label: m.settings_density_compact() },
		{ value: 'regular', label: m.settings_density_regular() },
		{ value: 'comfy', label: m.settings_density_comfy() }
	]);

	const timeModeOptions: Array<{ value: typeof settings.timeMode; label: string }> = $derived([
		{ value: 'rel', label: m.settings_time_relative() },
		{ value: 'abs', label: m.settings_time_absolute() }
	]);

	const hubUrl = env.PUBLIC_LANDING_URL
		? `${env.PUBLIC_LANDING_URL}/apps`
		: dev
			? 'http://localhost:3000/apps'
			: 'https://krieger2501.de/apps';

	const currentLocale = getLocale();

	const languageLabels: Record<string, string> = $derived({
		en: m.settings_lang_en(),
		de: m.settings_lang_de(),
		tr: m.settings_lang_tr()
	});
	const themeLabels: Record<string, string> = $derived({
		system: m.settings_theme_system(),
		light: m.settings_theme_light(),
		dark: m.settings_theme_dark()
	});
	const weekStartLabels: Record<string, string> = $derived({
		monday: m.settings_week_monday(),
		sunday: m.settings_week_sunday(),
		saturday: m.settings_week_saturday()
	});

	// ── Notifications ──
	let permState = $state<PermissionState>('default');
	let hasSubscription = $state(false);
	let standalone = $state(true);
	let busy = $state(false);
	let lastError = $state<string | null>(null);
	let renamingId = $state<string | null>(null);
	let renameLabel = $state('');
	let renameSheetOpen = $state(false);
	let removingId = $state<string | null>(null);
	let removingLabel = $state('');
	let removeSheetOpen = $state(false);

	onMount(async () => {
		permState = await getPermissionState();
		hasSubscription = (await getCurrentSubscription()) !== null;
		standalone = isStandalone();
	});

	async function onEnable() {
		if (busy) return;
		busy = true;
		lastError = null;
		try {
			const r = await enableNotifications({
				app: 'admin',
				vapidPublicKey: data.vapidPublicKey,
				label: defaultDeviceLabel()
			});
			permState = await getPermissionState();
			hasSubscription = (await getCurrentSubscription()) !== null;
			if (r.ok) await invalidateAll();
			else lastError = r.reason;
		} catch (err) {
			lastError = err instanceof Error ? err.message : String(err);
		} finally {
			busy = false;
		}
	}

	async function onDisable() {
		if (busy) return;
		busy = true;
		lastError = null;
		try {
			await disableNotifications();
			permState = await getPermissionState();
			hasSubscription = (await getCurrentSubscription()) !== null;
			await invalidateAll();
		} finally {
			busy = false;
		}
	}

	async function onTest() {
		if (busy) return;
		busy = true;
		lastError = null;
		try {
			const r = await sendTest();
			if (!r.ok) lastError = m.settings_test_send_failed();
		} finally {
			busy = false;
		}
	}

	function startRename(id: string, current: string | null) {
		renamingId = id;
		renameLabel = current ?? '';
		renameSheetOpen = true;
	}

	function startRemove(id: string, label: string) {
		removingId = id;
		removingLabel = label;
		removeSheetOpen = true;
	}

	function defaultDeviceLabel(): string {
		const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
		return defaultLabelFromUA(ua);
	}

	function focusOnMount(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	const statusInfo = $derived.by(() => {
		switch (permState) {
			case 'granted':
				if (!hasSubscription) {
					return {
						tone: 'idle' as const,
						icon: 'off' as const,
						title: m.settings_status_paused_title(),
						desc: m.settings_status_paused_desc()
					};
				}
				return {
					tone: 'ok' as const,
					icon: 'on' as const,
					title: m.settings_status_on_title(),
					desc: m.settings_status_on_desc()
				};
			case 'denied':
				return {
					tone: 'err' as const,
					icon: 'off' as const,
					title: m.settings_status_blocked_title(),
					desc: m.settings_status_blocked_desc()
				};
			case 'unsupported':
				return {
					tone: 'warn' as const,
					icon: 'off' as const,
					title: m.settings_status_unsupported_title(),
					desc: m.settings_status_unsupported_desc()
				};
			default:
				return {
					tone: 'idle' as const,
					icon: 'off' as const,
					title: m.settings_status_off_title(),
					desc: m.settings_status_off_desc()
				};
		}
	});

	const showEnableCta = $derived(
		permState === 'default' || (permState === 'granted' && !hasSubscription)
	);
	const showActiveActions = $derived(permState === 'granted' && hasSubscription);
	const isIOS = $derived(
		typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)
	);
</script>

<div class="page">
	<PageHeader title={m.nav_settings()}>
		{#snippet avatar()}
			<UserAvatarMenu />
		{/snippet}
	</PageHeader>
</div>

<div class="settings-page">
	{#if data.profile}
		<ProfileHubCard
			name={data.profile.name}
			email={data.profile.email}
			{hubUrl}
			displayName={data.profile.displayName}
			language={languageLabels[currentLocale] ?? currentLocale}
			weekStarts={weekStartLabels[data.profile.weekStartDay] ?? m.settings_week_monday()}
			theme={themeLabels[data.profile.theme] ?? data.profile.theme}
		/>
	{/if}

	<!-- Notifications section -->
	<section class="section">
		{#if data.devices.length > 0}
			<SectionLabel title={m.settings_section_notifications()} right={String(data.devices.length)} />
		{:else}
			<SectionLabel title={m.settings_section_notifications()} />
		{/if}

		{#if !standalone && permState !== 'unsupported'}
			<div class="ios-note">
				{#if isIOS}
					<strong>{m.settings_ios_intro()}</strong> tap <span class="kbd">{m.settings_ios_share()}</span> →
					<span class="kbd">{m.settings_ios_add()}</span>{m.settings_ios_outro()}
				{:else}
					{m.settings_install_hint()}
				{/if}
			</div>
		{/if}

		<div
			class="hero"
			class:hero-ok={statusInfo.tone === 'ok'}
			class:hero-warn={statusInfo.tone === 'warn'}
			class:hero-err={statusInfo.tone === 'err'}
		>
			<div class="hero-wash"></div>
			<div class="hero-icon">
				{#if statusInfo.icon === 'on'}
					<Bell size={26} strokeWidth={1.6} />
				{:else}
					<BellOff size={26} strokeWidth={1.6} />
				{/if}
			</div>
			<div class="hero-text">
				<div class="hero-title">{statusInfo.title}</div>
				<div class="hero-desc">{statusInfo.desc}</div>
			</div>

			{#if showEnableCta}
				<button type="button" class="hero-cta" onclick={onEnable} disabled={busy}
					>{m.settings_turn_on()}</button
				>
			{:else if showActiveActions}
				<div class="hero-actions">
					<button
						type="button"
						class="hero-icon-btn"
						onclick={onTest}
						disabled={busy}
						title={m.settings_send_test()}
					>
						<Send size={16} strokeWidth={1.8} />
					</button>
					<button
						type="button"
						class="hero-icon-btn"
						onclick={onDisable}
						disabled={busy}
						title={m.settings_turn_off()}
					>
						<BellOff size={16} strokeWidth={1.8} />
					</button>
				</div>
			{/if}
		</div>

		{#if lastError}
			<ErrorBanner
				label={m.settings_push_error()}
				message={lastError}
				onDismiss={() => (lastError = null)}
			/>
		{/if}

		{#if data.devices.length > 0}
			<div class="set-card">
				{#each data.devices as dev (dev.id)}
					{@const parsed = parseUserAgent(dev.userAgent)}
					{@const meta = `Added ${formatRelative(dev.createdAt)}${dev.lastUsedAt ? ` · last push ${formatRelative(dev.lastUsedAt)}` : ''}`}
					<DeviceListRow
						icon={deviceIcon(parsed.device, parsed.os)}
						label={dev.label ?? defaultLabelFromUA(dev.userAgent)}
						metaLines={[meta]}
					>
						{#snippet actions()}
							<button
								type="button"
								class="icon-btn"
								onclick={() => startRename(dev.id, dev.label)}
								aria-label={m.settings_rename_aria()}
							>
								<Pencil size={14} strokeWidth={1.8} />
							</button>
							<button
								type="button"
								class="icon-btn icon-btn-danger"
								onclick={() => startRemove(dev.id, dev.label ?? defaultLabelFromUA(dev.userAgent))}
								aria-label={m.settings_remove_aria()}
							>
								<Trash2 size={14} strokeWidth={1.8} />
							</button>
						{/snippet}
					</DeviceListRow>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Logs section -->
	<section class="section">
		<h2 class="section-title">{m.settings_section_logs()}</h2>

		<div class="card">
			<label class="row toggle-row">
				<div class="row-text">
					<span class="row-label">{m.settings_log_dark_label()}</span>
					<span class="row-sub">{m.settings_log_dark_sub()}</span>
				</div>
				<button
					type="button"
					class="toggle"
					class:on={settings.logDark}
					role="switch"
					aria-checked={settings.logDark}
					aria-label={m.settings_log_dark_label()}
					onclick={() => (settings.logDark = !settings.logDark)}
				></button>
			</label>

			<div class="divider"></div>

			<label class="row toggle-row">
				<div class="row-text">
					<span class="row-label">{m.settings_log_wrap_label()}</span>
					<span class="row-sub">{m.settings_log_wrap_sub()}</span>
				</div>
				<button
					type="button"
					class="toggle"
					class:on={settings.logWrap}
					role="switch"
					aria-checked={settings.logWrap}
					aria-label={m.settings_log_wrap_label()}
					onclick={() => (settings.logWrap = !settings.logWrap)}
				></button>
			</label>

			<div class="divider"></div>

			<div class="row segment-row">
				<div class="row-text">
					<span class="row-label">{m.settings_density_label()}</span>
					<span class="row-sub">{m.settings_density_sub()}</span>
				</div>
				<div class="segment" role="group" aria-label={m.settings_density_label()}>
					{#each densityOptions as opt (opt.value)}
						<button
							type="button"
							class="seg-btn"
							class:active={settings.logDensity === opt.value}
							onclick={() => (settings.logDensity = opt.value)}
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>

			<div class="divider"></div>

			<div class="row segment-row">
				<div class="row-text">
					<span class="row-label">{m.settings_time_label()}</span>
					<span class="row-sub">{m.settings_time_sub()}</span>
				</div>
				<div class="segment" role="group" aria-label={m.settings_time_label()}>
					{#each timeModeOptions as opt (opt.value)}
						<button
							type="button"
							class="seg-btn"
							class:active={settings.timeMode === opt.value}
							onclick={() => (settings.timeMode = opt.value)}
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- About section -->
	<AboutDiagnostics
		appName={m.settings_app_name()}
		appKey="admin"
		version={data.appMeta.version}
		commit={data.appMeta.commit}
		buildTime={data.appMeta.buildTime}
		email={data.diagnostics.email}
		userId={data.diagnostics.userId}
		correlationId={data.diagnostics.correlationId}
	/>
</div>

<BottomSheet
	bind:open={renameSheetOpen}
	title={m.settings_rename_title()}
	subtitle={m.settings_rename_subtitle()}
>
	<form
		method="POST"
		action="?/rename"
		use:enhance={() =>
			async ({ update }) => {
				await update({ reset: false });
				renameSheetOpen = false;
				renamingId = null;
			}}
	>
		<input type="hidden" name="id" value={renamingId ?? ''} />
		<label class="field">
			<span class="field-label">{m.settings_rename_label()}</span>
			<input
				type="text"
				name="label"
				bind:value={renameLabel}
				maxlength="64"
				placeholder={m.settings_rename_placeholder()}
				use:focusOnMount
			/>
		</label>
		<div class="sheet-actions sheet-actions-row">
			<button type="button" class="sheet-cancel" onclick={() => (renameSheetOpen = false)}>
				{m.common_cancel()}
			</button>
			<button type="submit" class="sheet-done">{m.common_save()}</button>
		</div>
	</form>
</BottomSheet>

<BottomSheet
	bind:open={removeSheetOpen}
	title={m.settings_remove_title()}
	subtitle={m.settings_remove_subtitle({ label: removingLabel })}
>
	<form
		method="POST"
		action="?/remove"
		use:enhance={() =>
			async ({ update }) => {
				await update({ reset: false });
				removeSheetOpen = false;
				removingId = null;
			}}
	>
		<input type="hidden" name="id" value={removingId ?? ''} />
		<div class="sheet-actions sheet-actions-row">
			<button type="button" class="sheet-cancel" onclick={() => (removeSheetOpen = false)}>
				{m.common_cancel()}
			</button>
			<button type="submit" class="sheet-done sheet-done-danger">{m.common_remove()}</button>
		</div>
	</form>
</BottomSheet>

<style>
	/* global: .section-title, .toggle, .toggle.on, .set-card, .set-row, .sr-icon, .sr-text, .sr-label, .sr-desc */

	.settings-page {
		padding: 4px 16px 32px;
		display: flex;
		flex-direction: column;
		gap: 28px;
	}

	/* ── Section ── */
	.section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	/* ── Card ── */
	.card {
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.divider {
		height: 1px;
		background: var(--color-border-subtle);
		margin: 0 16px;
	}

	/* ── Row ── */
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 16px;
		min-height: 52px;
	}

	.row-text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.row-label {
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-primary);
	}

	.row-sub {
		font-size: 12px;
		color: var(--color-text-subtle);
	}

	.toggle-row {
		cursor: pointer;
	}

	.segment-row {
		flex-wrap: wrap;
		gap: 10px;
	}

	/* ── Segmented control ── */
	.segment {
		display: flex;
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 1px solid var(--color-border-default);
	}

	.seg-btn {
		flex: 1;
		padding: 5px 10px;
		font-size: 12px;
		font-weight: 500;
		border: none;
		background: transparent;
		color: var(--color-text-subtle);
		cursor: pointer;
		transition:
			background var(--duration-fast) var(--ease-out),
			color var(--duration-fast) var(--ease-out);
		white-space: nowrap;
	}

	.seg-btn + .seg-btn {
		border-left: 1px solid var(--color-border-default);
	}

	.seg-btn.active {
		background: color-mix(in oklab, var(--color-accent) 12%, transparent);
		color: var(--accent-ink);
		font-weight: 600;
	}

	/* ── Notifications hero ── */
	.ios-note {
		padding: 10px 12px;
		font-size: 12.5px;
		color: var(--color-text-muted);
		line-height: 1.5;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}
	.kbd {
		display: inline-block;
		padding: 1px 6px;
		font-family: var(--font-mono);
		font-size: 11px;
		background: var(--color-bg-2);
		border-radius: 4px;
		border: 1px solid var(--color-border-default);
	}

	.hero {
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 18px;
		border-radius: var(--radius-2xl, 22px);
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
	}
	.hero-wash {
		pointer-events: none;
		position: absolute;
		inset: -40% -10% auto auto;
		width: 70%;
		height: 70%;
		background: radial-gradient(
			circle at 70% 30%,
			color-mix(in oklab, var(--color-text-faint) 18%, transparent) 0%,
			transparent 70%
		);
		opacity: 0.7;
	}
	.hero-ok .hero-wash {
		background: radial-gradient(
			circle at 70% 30%,
			color-mix(in oklab, var(--accent-ink) 26%, transparent) 0%,
			transparent 70%
		);
	}
	.hero-warn .hero-wash {
		background: radial-gradient(
			circle at 70% 30%,
			color-mix(in oklab, var(--warn-ink) 22%, transparent) 0%,
			transparent 70%
		);
	}
	.hero-err .hero-wash {
		background: radial-gradient(
			circle at 70% 30%,
			color-mix(in oklab, var(--err-ink) 24%, transparent) 0%,
			transparent 70%
		);
	}
	.hero-icon {
		position: relative;
		display: grid;
		place-items: center;
		width: 52px;
		height: 52px;
		border-radius: 999px;
		background: var(--color-bg-2);
		color: var(--color-text-subtle);
		flex-shrink: 0;
	}
	.hero-ok .hero-icon {
		background: color-mix(in oklab, var(--accent-ink) 18%, var(--color-surface-1));
		color: var(--accent-ink);
	}
	.hero-warn .hero-icon {
		background: color-mix(in oklab, var(--warn-ink) 18%, var(--color-surface-1));
		color: var(--warn-ink);
	}
	.hero-err .hero-icon {
		background: color-mix(in oklab, var(--err-ink) 18%, var(--color-surface-1));
		color: var(--err-ink);
	}
	.hero-text {
		position: relative;
		flex: 1;
		min-width: 0;
	}
	.hero-title {
		font-size: 16px;
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	.hero-desc {
		font-size: 12.5px;
		color: var(--color-text-subtle);
		margin-top: 3px;
		line-height: 1.4;
	}
	.hero-cta {
		position: relative;
		padding: 10px 16px;
		font-size: 13px;
		font-weight: 600;
		border-radius: 999px;
		background: var(--accent-ink);
		color: #fff;
		border: none;
		cursor: pointer;
		flex-shrink: 0;
		transition: opacity 150ms ease;
	}
	.hero-cta:disabled {
		opacity: 0.5;
		cursor: progress;
	}
	.hero-actions {
		position: relative;
		display: flex;
		gap: 6px;
		flex-shrink: 0;
	}
	.hero-icon-btn {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 999px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		color: var(--color-text-muted, var(--color-text-subtle));
		cursor: pointer;
	}
	.hero-icon-btn:disabled {
		opacity: 0.5;
		cursor: progress;
	}

	/* device action buttons (rendered inside DeviceListRow's actions snippet) */
	.icon-btn {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-default);
		border-radius: 999px;
		color: var(--color-text-subtle);
		cursor: pointer;
	}
	.icon-btn-danger:hover {
		color: var(--err-ink);
		border-color: var(--err-ink);
	}

	/* ── Rename sheet ── */
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
	.field input {
		width: 100%;
		padding: 12px;
		font-size: 14px;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		background: var(--color-surface-1);
	}
	.sheet-done {
		background: var(--accent-ink);
	}
</style>
