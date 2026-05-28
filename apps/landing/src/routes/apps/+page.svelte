<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { enhance } from '$app/forms';
	import { getLocale, setLocale, locales } from '$lib/paraglide/runtime.js';
	import { m } from '$lib/paraglide/messages.js';
	import {
		BottomSheet,
		SaveBar,
		SectionLabel,
		Toast,
		AboutDiagnostics,
		OptionPickerSheet,
		StubInfoSheet,
		UnsavedGuard
	} from '@nexo/ui';
	import SessionsSheet from '$lib/components/apps/SessionsSheet.svelte';
	import AppGrid from '$lib/components/apps/AppGrid.svelte';
	import NameEditSheet from '$lib/components/settings/NameEditSheet.svelte';
	import SignoutSheet from '$lib/components/settings/SignoutSheet.svelte';
	import type { PageData, ActionData } from './$types';

	const { data, form: actionData }: { data: PageData; form: ActionData } = $props();

	const languageLabels: Record<string, string> = {
		en: 'English',
		de: 'Deutsch',
		tr: 'Türkçe'
	};

	const languageIcons: Record<string, string> = {
		en: '🇬🇧',
		de: '🇩🇪',
		tr: '🇹🇷'
	};

	const languageDescs: Record<string, string> = {
		en: 'Default — every screen translated.',
		de: 'Beta — manche Knöpfe stottern noch auf Englisch.',
		tr: 'Beta — bazı düğmeler hâlâ İngilizce kekeliyor.'
	};

	const weekDayLabels = $derived<Record<string, string>>({
		monday: m.sheet_week_monday(),
		sunday: m.sheet_week_sunday(),
		saturday: m.sheet_week_saturday()
	});

	const weekDayOptions = $derived<{ value: string; label: string; desc: string; icon: string }[]>([
		{ value: 'monday', label: m.sheet_week_monday(), desc: m.sheet_week_monday_desc(), icon: '🇪🇺' },
		{ value: 'sunday', label: m.sheet_week_sunday(), desc: m.sheet_week_sunday_desc(), icon: '🇺🇸' },
		{
			value: 'saturday',
			label: m.sheet_week_saturday(),
			desc: m.sheet_week_saturday_desc(),
			icon: '🌙'
		}
	]);

	const initialLocale = $derived.by(() => {
		const fromDb =
			data.language && data.language !== 'auto'
				? (locales.find((l) => l === data.language) ?? null)
				: null;
		return fromDb ?? getLocale();
	});
	let selectedLocale = $state(
		(() => {
			const fromDb =
				data.language && data.language !== 'auto'
					? (locales.find((l) => l === data.language) ?? null)
					: null;
			return fromDb ?? getLocale();
		})()
	);
	// svelte-ignore state_referenced_locally
	let displayName = $state(data.displayName ?? '');
	// svelte-ignore state_referenced_locally
	let weekStartDay = $state(data.weekStartDay ?? 'monday');
	let saving = $state(false);

	function discardChanges() {
		displayName = data.displayName ?? '';
		weekStartDay = data.weekStartDay ?? 'monday';
		selectedLocale = initialLocale;
	}

	let nameSheetOpen = $state(false);
	let emailSheetOpen = $state(false);
	let backupsSheetOpen = $state(false);
	let exportSheetOpen = $state(false);
	let auditSheetOpen = $state(false);
	let sessionsSheetOpen = $state(false);
	let signoutSheetOpen = $state(false);
	let languageSheetOpen = $state(false);
	let weekSheetOpen = $state(false);
	let timeFormatSheetOpen = $state(false);
	let themeSheetOpen = $state(false);

	// Stubs — only one active option each, the rest are visible but disabled.
	let stubTimeFormat = $state<'24h' | '12h'>('24h');
	let stubTheme = $state<'light' | 'dark' | 'system'>('light');

	const languageOptions = $derived(
		locales.map((locale) => ({
			value: locale,
			label: languageLabels[locale] ?? locale,
			description: languageDescs[locale] ?? '',
			icon: languageIcons[locale] ?? '🌐'
		}))
	);

	const weekOptionsForPicker = $derived(
		weekDayOptions.map((o) => ({
			value: o.value,
			label: o.label,
			description: o.desc,
			icon: o.icon
		}))
	);

	const timeFormatOptions = $derived<
		{ value: '24h' | '12h'; label: string; description: string; icon: string; disabled?: boolean }[]
	>([
		{
			value: '24h',
			label: m.sheet_time_format_24h(),
			description: m.sheet_time_format_24h_eg(),
			icon: '🕐'
		},
		{
			value: '12h',
			label: m.sheet_time_format_12h(),
			description: m.sheet_time_format_12h_eg(),
			icon: '🕧',
			disabled: true
		}
	]);

	const themeOptions = $derived<
		{
			value: 'light' | 'dark' | 'system';
			label: string;
			description: string;
			icon: string;
			disabled?: boolean;
		}[]
	>([
		{
			value: 'light',
			label: m.sheet_theme_light(),
			description: m.sheet_theme_light_desc(),
			icon: '☀️'
		},
		{
			value: 'dark',
			label: m.sheet_theme_dark(),
			description: m.sheet_theme_dark_desc(),
			icon: '🌙',
			disabled: true
		},
		{
			value: 'system',
			label: m.sheet_theme_system(),
			description: m.sheet_theme_system_desc(),
			icon: '💻',
			disabled: true
		}
	]);

	let toastOpen = $state(false);
	let toastMessage = $state('');
	let toastType = $state<'success' | 'error'>('success');

	$effect(() => {
		if (actionData?.toast) {
			toastMessage = actionData.toast as string;
			toastType = 'success';
			toastOpen = true;
		} else if (actionData?.error) {
			toastMessage = actionData.error as string;
			toastType = 'error';
			toastOpen = true;
		}
	});

	const dirty = $derived(
		displayName !== (data.displayName ?? '') ||
			selectedLocale !== initialLocale ||
			weekStartDay !== (data.weekStartDay ?? 'monday')
	);

	const firstName = $derived(
		(data.displayName || data.user.name || m.apps_default_first_name()).split(' ')[0]
	);
	const initials = $derived(
		(data.displayName || data.user.name || 'U')
			.split(' ')
			.map((w: string) => w[0])
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);

	type LiveApp = {
		id: string;
		name: string;
		monogram: string;
		icon?: string;
		accent: string;
		desc: string;
		href: string;
		meta: string;
	};

	type WorkshopApp = {
		id: string;
		name: string;
		monogram: string;
		icon?: string;
		accent: string;
		desc: string;
		meta: string;
	};

	type IdeaApp = {
		id: string;
		name: string;
		monogram: string;
		icon?: string;
		accent: string;
		sub: string;
	};

	const liveApps: LiveApp[] = $derived(
		[
			data.allowedApps.includes('finance') && {
				id: 'finance',
				name: 'Finance',
				monogram: 'F',
				icon: '/icon-finance-dark.svg',
				accent: 'var(--color-accent-finance)',
				desc: m.appdesc_finance(),
				href: env.PUBLIC_FINANCE_URL ?? '#',
				meta: `v${data.appVersions.finance}`
			},
			data.allowedApps.includes('flaschen') && {
				id: 'flaschen',
				name: 'Flaschen',
				monogram: 'F',
				icon: '/icon-flaschen-dark.svg',
				accent: '#a50a50',
				desc: m.appdesc_flaschen(),
				href: env.PUBLIC_FLASCHEN_URL ?? '#',
				meta: `v${data.appVersions.flaschen}`
			},
			data.allowedApps.includes('calorie') && {
				id: 'calorie',
				name: 'Calorie',
				monogram: 'C',
				icon: '/icon-calorie-dark.svg',
				accent: '#b85a3a',
				desc: m.appdesc_calorie(),
				href: env.PUBLIC_CALORIE_URL ?? '#',
				meta: `v${data.appVersions.calorie}`
			},
			data.allowedApps.includes('admin') && {
				id: 'admin',
				name: 'Admin',
				monogram: 'A',
				icon: '/icon-admin.svg',
				accent: '#3b82f6',
				desc: m.appdesc_admin(),
				href: env.PUBLIC_ADMIN_URL ?? '#',
				meta: `v${data.appVersions.admin}`
			}
		].filter(Boolean) as LiveApp[]
	);

	const workshopApps: WorkshopApp[] = $derived([
		{
			id: 'gym',
			name: 'Gym',
			monogram: 'G',
			icon: '/icon-gym.svg',
			accent: 'var(--color-accent-gym)',
			desc: m.appdesc_gym(),
			meta: m.appmeta_gym()
		},
		{
			id: 'time',
			name: 'Time Tracker',
			monogram: 'T',
			accent: 'var(--color-accent-time)',
			desc: m.appdesc_time(),
			meta: m.appmeta_time()
		}
	]);

	const ideaApps: IdeaApp[] = $derived([
		{
			id: 'pomodoro',
			name: 'Pomodoro',
			monogram: 'P',
			accent: 'var(--color-accent-pomodoro)',
			sub: m.appsub_pomodoro()
		},
		{
			id: 'books',
			name: 'Books',
			monogram: 'B',
			accent: 'var(--color-text-subtle)',
			sub: m.appsub_books()
		},
		{
			id: 'recipes',
			name: 'Recipes',
			monogram: 'R',
			accent: 'var(--color-text-subtle)',
			sub: m.appsub_recipes()
		},
		{
			id: 'movies',
			name: 'Movies',
			monogram: 'M',
			accent: 'var(--color-text-subtle)',
			sub: m.appsub_movies()
		}
	]);

	$effect(() => {
		if (saving || !dirty) return;
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	});
</script>

<svelte:head>
	<title>{m.apps_page_title()}</title>
</svelte:head>

<div class="page">
	<!-- Brand strip -->
	<div class="brand-strip">
		<span class="brand">
			<span class="brand-mark"></span>
			<span>Nexo</span>
		</span>
		<span class="version">v{data.appVersions.landing}</span>
	</div>

	<!-- Profile hero -->
	<div class="profile-hero">
		<div class="avatar-big">{initials}</div>
		<div class="who">
			<div class="name">{m.apps_greeting({ firstName })}</div>
			<div class="greeting">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- interpolated values are integer .length counts, not user input -->
				{@html m.apps_status_summary({
					live: `<b>${liveApps.length}</b>`,
					coming: `<b>${workshopApps.length + ideaApps.length}</b>`
				})}
			</div>
		</div>
		<button
			type="button"
			class="icon-btn"
			aria-label={m.apps_edit_profile_aria()}
			onclick={() => (nameSheetOpen = true)}
		>
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path d="M12 20h9" /><path
					d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"
				/></svg
			>
		</button>
	</div>

	<!-- Your Apps / Workshop / Ideas -->
	<AppGrid
		{liveApps}
		{workshopApps}
		{ideaApps}
		financeGlance={data.financeGlance}
		flaschenGlance={data.flaschenGlance}
		calorieGlance={data.calorieGlance}
		adminGlance={data.adminGlance}
	/>

	<!-- Settings: Profile -->
	<SectionLabel title={m.settings_profile()} subtitle={m.settings_profile_sub()} />

	<form
		id="settings-form"
		method="POST"
		action="?/save"
		use:enhance={() => {
			saving = true;
			const localeChanged = selectedLocale !== getLocale();
			return async ({ update }) => {
				await update({ reset: false });
				if (localeChanged) {
					setLocale(selectedLocale);
				} else {
					saving = false;
				}
			};
		}}
	>
		<div class="set-card">
			<div class="set-scope">
				<b>{m.settings_scope_identity_label()}</b> · {m.settings_scope_identity_desc()}
			</div>
			<button type="button" class="set-row" onclick={() => (nameSheetOpen = true)}>
				<div class="sr-icon">@</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_display_name()}</div>
					<div class="sr-desc">{m.settings_display_name_desc()}</div>
				</div>
				<div class="sr-value">{displayName || m.settings_display_name_empty()}</div>
				<span class="sr-chev">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="m9 6 6 6-6 6" /></svg
					>
				</span>
			</button>
			<button type="button" class="set-row" onclick={() => (emailSheetOpen = true)}>
				<div class="sr-icon">✉</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_email()}</div>
					<div class="sr-desc">{m.settings_email_desc()}</div>
				</div>
				<div class="sr-value">{data.user.email}</div>
				<span class="sr-chev">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="m9 6 6 6-6 6" /></svg
					>
				</span>
			</button>

			<div class="set-scope">
				<b>{m.settings_scope_locale_label()}</b> · {m.settings_scope_locale_desc()}
			</div>
			<button type="button" class="set-row" onclick={() => (languageSheetOpen = true)}>
				<div class="sr-icon">🌐</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_language()}</div>
				</div>
				<div class="sr-value">{languageLabels[selectedLocale] ?? selectedLocale}</div>
				<span class="sr-chev">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="m9 6 6 6-6 6" /></svg
					>
				</span>
			</button>
			<button type="button" class="set-row" onclick={() => (weekSheetOpen = true)}>
				<div class="sr-icon">📅</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_week_starts()}</div>
				</div>
				<div class="sr-value">{weekDayLabels[weekStartDay] ?? m.sheet_week_monday()}</div>
				<span class="sr-chev">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="m9 6 6 6-6 6" /></svg
					>
				</span>
			</button>
			<button type="button" class="set-row stub-row" onclick={() => (timeFormatSheetOpen = true)}>
				<div class="sr-icon">🕒</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_time_format()}</div>
				</div>
				<div class="sr-value stub-value">{m.settings_time_format_value()}</div>
				<span class="sr-chev">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="m9 6 6 6-6 6" /></svg
					>
				</span>
			</button>

			<div class="set-scope">
				<b>{m.settings_scope_appearance_label()}</b> · {m.settings_scope_appearance_desc()}
			</div>
			<button type="button" class="set-row stub-row" onclick={() => (themeSheetOpen = true)}>
				<div class="sr-icon">☀</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_theme()}</div>
					<div class="sr-desc">{m.settings_theme_desc()}</div>
				</div>
				<div class="sr-value stub-value">{m.settings_theme_value()}</div>
				<span class="sr-chev">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="m9 6 6 6-6 6" /></svg
					>
				</span>
			</button>
		</div>

		<!-- Data -->
		<SectionLabel title={m.settings_data()} subtitle={m.settings_data_sub()} />

		<div class="set-card">
			<button type="button" class="set-row stub-row" onclick={() => (backupsSheetOpen = true)}>
				<div class="sr-icon">💾</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_backups()}</div>
					<div class="sr-desc">{m.settings_backups_desc()}</div>
				</div>
				<span class="dot-on">{m.settings_backups_on()}</span>
			</button>
			<button type="button" class="set-row stub-row" onclick={() => (exportSheetOpen = true)}>
				<div class="sr-icon">↓</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_export()}</div>
					<div class="sr-desc">{m.settings_export_desc()}</div>
				</div>
				<div class="sr-value stub-value">{m.settings_export_value()}</div>
				<span class="sr-chev">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="m9 6 6 6-6 6" /></svg
					>
				</span>
			</button>
			<button type="button" class="set-row stub-row" onclick={() => (auditSheetOpen = true)}>
				<div class="sr-icon">📜</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_audit()}</div>
					<div class="sr-desc">{m.settings_audit_desc()}</div>
				</div>
				<div class="sr-value stub-value">{m.settings_audit_value()}</div>
				<span class="sr-chev">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="m9 6 6 6-6 6" /></svg
					>
				</span>
			</button>
		</div>

		<!-- Account -->
		<SectionLabel title={m.settings_account()} />

		<div class="set-card">
			<button type="button" class="set-row" onclick={() => (sessionsSheetOpen = true)}>
				<div class="sr-icon">🔑</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_sessions()}</div>
					<div class="sr-desc">{m.settings_sessions_active({ count: data.sessions.length })}</div>
				</div>
				<div class="sr-value">{data.sessions.length}</div>
				<span class="sr-chev">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="m9 6 6 6-6 6" /></svg
					>
				</span>
			</button>
			<button type="button" class="set-row danger-row" onclick={() => (signoutSheetOpen = true)}>
				<div class="sr-icon">⎋</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_signout()}</div>
				</div>
				<span class="sr-chev">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="m9 6 6 6-6 6" /></svg
					>
				</span>
			</button>
		</div>

		{#if actionData?.error}
			<p class="feedback error">{actionData.error}</p>
		{/if}

		<!-- Hidden form inputs for save action -->
		<input type="hidden" name="displayName" value={displayName} />
		<input type="hidden" name="weekStartDay" value={weekStartDay} />
		<input type="hidden" name="language" value={selectedLocale} />
		<input type="hidden" name="theme" value={data.theme ?? 'system'} />
	</form>

	<SaveBar visible={dirty} formId="settings-form" />

	<UnsavedGuard
		{dirty}
		formId="settings-form"
		onDiscard={discardChanges}
		title={m.nav_guard_msg()}
		description=""
		saveLabel={m.nav_guard_stay()}
		discardLabel={m.nav_guard_discard()}
	/>

	<!-- About / diagnostics -->
	<AboutDiagnostics
		appName="Nexo"
		appKey="landing"
		version={data.appVersions.landing}
		commit={data.appMeta.commit}
		buildTime={data.appMeta.buildTime}
		email={data.diagnostics.email}
		userId={data.diagnostics.userId}
		correlationId={data.diagnostics.correlationId ?? undefined}
	/>

	<!-- Footer -->
	<footer class="app-footer">
		<span class="wink">{m.apps_footer_wink()}</span>
	</footer>

	<!-- Settings sheets -->
	<NameEditSheet bind:open={nameSheetOpen} bind:value={displayName} />

	<StubInfoSheet
		bind:open={emailSheetOpen}
		title={m.sheet_title_email()}
		subtitle={m.sheet_email_sub()}
		stubNotice={m.sheet_email_stub()}
		closeLabel={m.sheet_action_close()}
	>
		{m.sheet_email_currently()} <b>{data.user.email}</b><br />
		{m.sheet_email_verified()}
	</StubInfoSheet>

	<StubInfoSheet
		bind:open={backupsSheetOpen}
		title={m.sheet_title_backups()}
		subtitle={m.sheet_backups_sub()}
		stubNotice={m.sheet_backups_stub()}
		closeLabel={m.sheet_action_close()}
	/>

	<StubInfoSheet
		bind:open={exportSheetOpen}
		title={m.sheet_title_export()}
		subtitle={m.sheet_export_sub()}
		stubNotice={m.sheet_export_stub()}
		closeLabel={m.sheet_action_close()}
	>
		<b>{m.sheet_export_inside_label()}</b><br />
		· {m.sheet_export_inside_finance()}<br />
		· {m.sheet_export_inside_profile()}<br />
		· {m.sheet_export_inside_audit()}
	</StubInfoSheet>

	<StubInfoSheet
		bind:open={auditSheetOpen}
		title={m.sheet_title_audit()}
		subtitle={m.sheet_audit_sub()}
		stubNotice={m.sheet_audit_stub()}
		closeLabel={m.sheet_action_close()}
	/>

	<BottomSheet bind:open={sessionsSheetOpen} title={m.sheet_title_sessions()}>
		<SessionsSheet sessions={data.sessions} onclose={() => (sessionsSheetOpen = false)} />
	</BottomSheet>

	<SignoutSheet
		bind:open={signoutSheetOpen}
		signOutHref={`${env.PUBLIC_AUTH_URL}/signout`}
	/>

	<OptionPickerSheet
		bind:open={languageSheetOpen}
		bind:value={selectedLocale}
		title={m.sheet_title_language()}
		subtitle={m.sheet_language_sub()}
		options={languageOptions}
		doneLabel={m.sheet_action_done()}
	/>

	<OptionPickerSheet
		bind:open={weekSheetOpen}
		bind:value={weekStartDay}
		title={m.sheet_title_week()}
		subtitle={m.sheet_week_sub()}
		options={weekOptionsForPicker}
		doneLabel={m.sheet_action_done()}
	/>

	<OptionPickerSheet
		bind:open={timeFormatSheetOpen}
		bind:value={stubTimeFormat}
		title={m.sheet_title_time_format()}
		subtitle={m.sheet_time_format_sub()}
		options={timeFormatOptions}
		stubNotice={m.sheet_time_format_stub()}
		doneLabel={m.sheet_action_close()}
	/>

	<OptionPickerSheet
		bind:open={themeSheetOpen}
		bind:value={stubTheme}
		title={m.sheet_title_theme()}
		subtitle={m.sheet_theme_sub()}
		options={themeOptions}
		doneLabel={m.sheet_action_close()}
	/>
</div>

<Toast bind:open={toastOpen} type={toastType} message={toastMessage} duration={3000} />

<style>
	.page {
		min-height: 100dvh;
		padding: 16px 16px calc(16px + env(safe-area-inset-bottom, 0px));
		max-width: 480px;
		margin: 0 auto;
		overflow-x: hidden;
	}

	/* ─── Brand strip ─── */
	.brand-strip {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 6px 4px 14px;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	.brand-mark {
		width: 22px;
		height: 22px;
		border-radius: var(--radius-sm);
		background: linear-gradient(
			135deg,
			var(--color-accent),
			color-mix(in oklab, var(--color-accent) 50%, #000)
		);
		box-shadow:
			0 0 0 1px var(--color-border-default),
			0 4px 12px color-mix(in oklab, var(--color-accent) 40%, transparent);
	}
	.version {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}

	/* ─── Profile hero ─── */
	.profile-hero {
		position: relative;
		padding: 22px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-2xl);
		display: flex;
		align-items: center;
		gap: 16px;
		overflow: hidden;
	}
	.profile-hero::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(
			60% 80% at 0% -20%,
			color-mix(in oklab, var(--color-accent) 14%, transparent),
			transparent 70%
		);
		pointer-events: none;
	}
	.profile-hero > * {
		position: relative;
		z-index: 1;
	}
	.avatar-big {
		width: 64px;
		height: 64px;
		border-radius: 999px;
		background: linear-gradient(
			135deg,
			var(--color-accent),
			color-mix(in oklab, var(--color-accent) 55%, #000)
		);
		color: #fff;
		display: grid;
		place-items: center;
		font-size: 22px;
		font-weight: 600;
		letter-spacing: 0.01em;
		box-shadow:
			0 0 0 3px var(--color-surface-1),
			0 0 0 4px var(--color-border-subtle),
			0 6px 16px color-mix(in oklab, var(--color-accent) 40%, transparent);
		flex-shrink: 0;
	}
	.who {
		flex: 1;
		min-width: 0;
	}
	.who .name {
		font-size: 22px;
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.1;
	}
	.who .greeting {
		margin-top: 4px;
		font-size: 13.5px;
		color: var(--color-text-muted);
		line-height: 1.45;
	}
	.who .greeting :global(b) {
		color: var(--color-text-primary);
		font-weight: 500;
	}
	.icon-btn {
		width: 36px;
		height: 36px;
		border-radius: 999px;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-default);
		display: grid;
		place-items: center;
		cursor: pointer;
		flex-shrink: 0;
		color: var(--color-text-muted);
		transition:
			background var(--duration-fast) var(--ease-out),
			border-color var(--duration-fast) var(--ease-out);
	}
	.icon-btn:active {
		background: var(--color-surface-2);
	}
	.icon-btn svg {
		width: 15px;
		height: 15px;
		stroke-width: 1.8;
	}

	/* ─── Settings card ─── */
	.set-card {
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		overflow: hidden;
	}
	.set-scope {
		padding: 12px 16px 8px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-faint);
		background: var(--color-surface-1);
		border-top: 1px solid var(--color-border-subtle);
	}
	.set-card .set-scope:first-child {
		border-top: 0;
	}
	.set-scope b,
	.set-scope :global(b) {
		color: var(--color-text-subtle);
		font-weight: 500;
		letter-spacing: 0.04em;
	}
	.set-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		border-top: 1px solid var(--color-border-subtle);
		cursor: pointer;
		transition: background var(--duration-fast) var(--ease-out);
		background: transparent;
		border-left: 0;
		border-right: 0;
		border-bottom: 0;
		width: 100%;
		text-align: left;
		font: inherit;
		color: inherit;
		text-decoration: none;
	}
	.set-row:first-child {
		border-top: 0;
	}
	.set-row:active {
		background: var(--color-surface-2);
	}
	.sr-icon {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: var(--color-bg-1);
		display: grid;
		place-items: center;
		font-size: 15px;
		color: var(--color-text-muted);
		flex-shrink: 0;
	}
	.sr-text {
		flex: 1;
		min-width: 0;
	}
	.sr-label {
		font-size: 14.5px;
		font-weight: 500;
		letter-spacing: -0.005em;
		color: var(--color-text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.sr-desc {
		font-size: 12px;
		color: var(--color-text-subtle);
		margin-top: 2px;
		line-height: 1.4;
	}
	.sr-value {
		font-family: var(--font-mono);
		font-size: 12.5px;
		color: var(--color-text-muted);
		letter-spacing: 0;
		text-align: right;
		flex-shrink: 0;
		white-space: nowrap;
	}
	.sr-chev {
		color: var(--color-text-faint);
		margin-left: 4px;
		flex-shrink: 0;
	}
	.sr-chev svg {
		width: 12px;
		height: 12px;
		stroke-width: 1.8;
	}

	/* Stub rows */
	.stub-row .sr-label,
	.stub-row .sr-desc {
		opacity: 0.65;
	}
	.stub-value {
		opacity: 0.55;
	}

	/* Dot indicator */
	.dot-on {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		color: color-mix(in oklab, var(--color-accent) 80%, #000);
		flex-shrink: 0;
	}
	.dot-on::before {
		content: '';
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-accent);
		box-shadow: 0 0 6px color-mix(in oklab, var(--color-accent) 60%, transparent);
	}

	/* Danger row */
	.danger-row .sr-icon {
		color: oklch(0.59 0.2 27);
		background: color-mix(in oklab, oklch(0.59 0.2 27) 10%, var(--color-bg-1));
	}
	.danger-row .sr-label {
		color: oklch(0.59 0.2 27);
	}

	.feedback {
		margin: 12px 0 0;
		font-size: 13px;
		text-align: center;
	}
	.feedback.error {
		color: var(--color-text-muted);
	}

	/* ─── Footer ─── */
	.app-footer {
		margin-top: 32px;
		padding: 20px 0 0;
		text-align: center;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--color-text-faint);
		letter-spacing: 0.06em;
		line-height: 1.7;
	}
	.wink {
		display: block;
		font-family: var(--font-sans);
		letter-spacing: -0.005em;
		font-style: italic;
		font-size: 12px;
		color: var(--color-text-faint);
		margin-top: 4px;
		text-transform: none;
	}

	/* ─── Sheet content ─── */
	.sheet-btn-danger:active {
		opacity: 0.85;
	}
</style>
