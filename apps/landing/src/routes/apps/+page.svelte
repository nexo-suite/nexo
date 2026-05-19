<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { enhance } from '$app/forms';
	import { beforeNavigate } from '$app/navigation';
	import { getLocale, setLocale, locales } from '$lib/paraglide/runtime.js';
	import { BottomSheet, SaveBar, Toast } from '@nexo/ui';
	import SessionsSheet from '$lib/components/apps/SessionsSheet.svelte';
	import AppGrid from '$lib/components/apps/AppGrid.svelte';
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

	const weekDayLabels: Record<string, string> = {
		monday: 'Monday',
		sunday: 'Sunday',
		saturday: 'Saturday'
	};

	const weekDayOptions: { value: string; label: string; desc: string; icon: string }[] = [
		{ value: 'monday', label: 'Monday', desc: 'ISO 8601 · most of Europe', icon: '🇪🇺' },
		{ value: 'sunday', label: 'Sunday', desc: 'US convention', icon: '🇺🇸' },
		{ value: 'saturday', label: 'Saturday', desc: 'Middle East', icon: '🌙' }
	];

	const initialLocale = getLocale();
	let selectedLocale = $state(initialLocale);
	// svelte-ignore state_referenced_locally
	let displayName = $state(data.displayName ?? '');
	// svelte-ignore state_referenced_locally
	let weekStartDay = $state(data.weekStartDay ?? 'monday');
	let pendingNav = $state<{ proceed: () => void } | null>(null);

	type SheetField =
		| 'name'
		| 'email'
		| 'language'
		| 'week'
		| 'time-format'
		| 'theme'
		| 'backups'
		| 'export'
		| 'audit'
		| 'sessions'
		| 'signout'
		| null;
	let settingsSheetOpen = $state(false);
	let settingsSheetField = $state<SheetField>(null);

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

	const firstName = $derived((data.displayName || data.user.name || 'there').split(' ')[0]);
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
		accent: string;
		desc: string;
		href: string;
		meta: string;
	};

	type WorkshopApp = {
		id: string;
		name: string;
		monogram: string;
		accent: string;
		desc: string;
		meta: string;
	};

	type IdeaApp = {
		id: string;
		name: string;
		monogram: string;
		accent: string;
		sub: string;
	};

	const liveApps: LiveApp[] = $derived(
		[
			data.allowedApps.includes('finance') && {
				id: 'finance',
				name: 'Finance',
				monogram: 'F',
				accent: 'var(--color-accent-finance)',
				desc: 'Track accounts, categorize spend, see where the month went.',
				href: env.PUBLIC_FINANCE_URL ?? '#',
				meta: `v${__APP_VERSIONS__.finance}`
			},
			data.allowedApps.includes('admin') && {
				id: 'admin',
				name: 'Admin',
				monogram: 'A',
				accent: '#3b82f6',
				desc: 'Services, users, logs — the control room.',
				href: env.PUBLIC_ADMIN_URL ?? '#',
				meta: `v${__APP_VERSIONS__.admin}`
			}
		].filter(Boolean) as LiveApp[]
	);

	const workshopApps: WorkshopApp[] = [
		{
			id: 'gym',
			name: 'Gym',
			monogram: 'G',
			accent: 'var(--color-accent-gym)',
			desc: 'Log lifts, watch the progressive overload curve. Built for the once-a-week strength routine I keep forgetting to write down.',
			meta: 'eta: when I stop missing leg day'
		},
		{
			id: 'time',
			name: 'Time Tracker',
			monogram: 'T',
			accent: 'var(--color-accent-time)',
			desc: 'Receipts for your week. Project timers + a calendar view + invoice-ready exports.',
			meta: 'eta: q3 · stuck on the timer UI'
		}
	];

	const ideaApps: IdeaApp[] = [
		{
			id: 'pomodoro',
			name: 'Pomodoro',
			monogram: 'P',
			accent: 'var(--color-accent-pomodoro)',
			sub: 'a focus timer'
		},
		{
			id: 'books',
			name: 'Books',
			monogram: 'B',
			accent: 'var(--color-text-subtle)',
			sub: 'reading log'
		},
		{
			id: 'recipes',
			name: 'Recipes',
			monogram: 'R',
			accent: 'var(--color-text-subtle)',
			sub: 'what works'
		},
		{
			id: 'movies',
			name: 'Movies',
			monogram: 'M',
			accent: 'var(--color-text-subtle)',
			sub: 'watch list'
		}
	];

	beforeNavigate(({ cancel, to }) => {
		if (!dirty || !to) return;
		cancel();
		pendingNav = {
			proceed: () => {
				pendingNav = null;
				window.location.href = to.url.href;
			}
		};
	});

	$effect(() => {
		if (!dirty) return;
		const handler = (e: BeforeUnloadEvent) => {
			e.preventDefault();
		};
		window.addEventListener('beforeunload', handler);
		return () => window.removeEventListener('beforeunload', handler);
	});

	function openSheet(field: SheetField) {
		settingsSheetField = field;
		settingsSheetOpen = true;
	}

	function stubAction(_feature: string) {
		return;
	}
</script>

<svelte:head>
	<title>Your apps — Nexo</title>
</svelte:head>

<div class="page">
	<!-- Brand strip -->
	<div class="brand-strip">
		<span class="brand">
			<span class="brand-mark"></span>
			<span>Nexo</span>
		</span>
		<span class="version">v{__APP_VERSIONS__.landing}</span>
	</div>

	<!-- Profile hero -->
	<div class="profile-hero">
		<div class="avatar-big">{initials}</div>
		<div class="who">
			<div class="name">Hey, {firstName}</div>
			<div class="greeting">
				<b>{liveApps.length}</b> app{liveApps.length !== 1 ? 's' : ''} live,
				<b>{workshopApps.length}</b> in the workshop.
			</div>
		</div>
		<button
			type="button"
			class="icon-btn"
			aria-label="Edit profile"
			onclick={() => openSheet('name')}
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
	<AppGrid {liveApps} {workshopApps} {ideaApps} financeGlance={data.financeGlance} />

	<!-- Settings: Profile -->
	<div class="sec">
		<span class="sec-title"><b>Profile</b></span>
		<span class="sec-right">same across all apps</span>
	</div>

	<form
		id="settings-form"
		method="POST"
		action="?/save"
		use:enhance={() => {
			return async ({ update }) => {
				setLocale(selectedLocale);
				await update({ reset: false });
			};
		}}
	>
		<div class="set-card">
			<div class="set-scope"><b>Identity</b> · how Nexo greets you</div>
			<button type="button" class="set-row" onclick={() => openSheet('name')}>
				<div class="sr-icon">@</div>
				<div class="sr-text">
					<div class="sr-label">Display name</div>
					<div class="sr-desc">Used in greetings and shared debt items.</div>
				</div>
				<div class="sr-value">{displayName || 'Set name'}</div>
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
			<button type="button" class="set-row" onclick={() => openSheet('email')}>
				<div class="sr-icon">✉</div>
				<div class="sr-text">
					<div class="sr-label">Email</div>
					<div class="sr-desc">Sign-in identity. One per Nexo account.</div>
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

			<div class="set-scope"><b>Locale</b> · how Nexo speaks</div>
			<button type="button" class="set-row" onclick={() => openSheet('language')}>
				<div class="sr-icon">🌐</div>
				<div class="sr-text">
					<div class="sr-label">Language</div>
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
			<button type="button" class="set-row" onclick={() => openSheet('week')}>
				<div class="sr-icon">📅</div>
				<div class="sr-text">
					<div class="sr-label">Week starts</div>
				</div>
				<div class="sr-value">{weekDayLabels[weekStartDay] ?? 'Monday'}</div>
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
			<button type="button" class="set-row stub-row" onclick={() => openSheet('time-format')}>
				<div class="sr-icon">🕒</div>
				<div class="sr-text">
					<div class="sr-label">Time format</div>
				</div>
				<div class="sr-value stub-value">24h</div>
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

			<div class="set-scope"><b>Appearance</b> · light only, for now</div>
			<button type="button" class="set-row stub-row" onclick={() => openSheet('theme')}>
				<div class="sr-icon">☀</div>
				<div class="sr-text">
					<div class="sr-label">Theme</div>
					<div class="sr-desc">Dark mode arrives when it earns the bug count.</div>
				</div>
				<div class="sr-value stub-value">Light</div>
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
		<div class="sec">
			<span class="sec-title"><b>Data</b></span>
			<span class="sec-right">your stuff</span>
		</div>

		<div class="set-card">
			<button type="button" class="set-row stub-row" onclick={() => openSheet('backups')}>
				<div class="sr-icon">💾</div>
				<div class="sr-text">
					<div class="sr-label">Backups</div>
					<div class="sr-desc">Daily, to your B2 bucket.</div>
				</div>
				<span class="dot-on">on</span>
			</button>
			<button type="button" class="set-row stub-row" onclick={() => openSheet('export')}>
				<div class="sr-icon">↓</div>
				<div class="sr-text">
					<div class="sr-label">Export everything</div>
					<div class="sr-desc">.zip of all apps, JSON + CSV. Yours, always.</div>
				</div>
				<div class="sr-value stub-value">.zip</div>
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
			<button type="button" class="set-row stub-row" onclick={() => openSheet('audit')}>
				<div class="sr-icon">📜</div>
				<div class="sr-text">
					<div class="sr-label">Audit log</div>
					<div class="sr-desc">Every change you've ever made.</div>
				</div>
				<div class="sr-value stub-value">view</div>
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
		<div class="sec">
			<span class="sec-title"><b>Account</b></span>
		</div>

		<div class="set-card">
			<button type="button" class="set-row" onclick={() => openSheet('sessions')}>
				<div class="sr-icon">🔑</div>
				<div class="sr-text">
					<div class="sr-label">Sessions</div>
					<div class="sr-desc">{data.sessions.length} active</div>
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
			<button type="button" class="set-row danger-row" onclick={() => openSheet('signout')}>
				<div class="sr-icon">⎋</div>
				<div class="sr-text">
					<div class="sr-label">Sign out</div>
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
	</form>

	<SaveBar visible={dirty} formId="settings-form" />

	<!-- Footer -->
	<footer class="app-footer">
		NEXO · v0.4 · <span class="footer-link">privacy</span> · <span class="footer-link">github</span>
		<span class="wink">made by Kevin, for the people he likes</span>
	</footer>

	<!-- Settings sheets -->
	<BottomSheet
		bind:open={settingsSheetOpen}
		title={settingsSheetField === 'name'
			? 'Display name'
			: settingsSheetField === 'email'
				? 'Email'
				: settingsSheetField === 'language'
					? 'Language'
					: settingsSheetField === 'week'
						? 'Week starts'
						: settingsSheetField === 'time-format'
							? 'Time format'
							: settingsSheetField === 'theme'
								? 'Theme'
								: settingsSheetField === 'backups'
									? 'Backups'
									: settingsSheetField === 'export'
										? 'Export everything'
										: settingsSheetField === 'audit'
											? 'Audit log'
											: settingsSheetField === 'sessions'
												? 'Sessions'
												: settingsSheetField === 'signout'
													? 'Sign out?'
													: ''}
	>
		{#if settingsSheetField === 'name'}
			<p class="sheet-sub">Used in greetings and shared items across all your apps.</p>
			<div class="sheet-field">
				<label for="sheetName">Your name</label>
				<input
					id="sheetName"
					type="text"
					bind:value={displayName}
					maxlength="32"
					placeholder="Your name"
				/>
			</div>
			<div class="sheet-hint">
				Just a first name works. Friends see this in Finance debts and shared items.
			</div>
			<button type="button" class="sheet-done" onclick={() => (settingsSheetOpen = false)}
				>Done</button
			>
		{:else if settingsSheetField === 'email'}
			<p class="sheet-sub">Your sign-in identity. Changing it requires verification.</p>
			<div class="sheet-info">
				Currently <b>{data.user.email}</b><br />
				Verified · primary
			</div>
			<div class="sheet-stub-notice">Email change not yet available.</div>
			<button type="button" class="sheet-done secondary" onclick={() => (settingsSheetOpen = false)}
				>Close</button
			>
		{:else if settingsSheetField === 'language'}
			<p class="sheet-sub">Affects every app's interface text.</p>
			<div class="sheet-picker">
				{#each locales as locale (locale)}
					<button
						type="button"
						class="sheet-opt"
						class:active={locale === selectedLocale}
						onclick={() => (selectedLocale = locale)}
					>
						<span class="sheet-opt-icon">{languageIcons[locale] ?? '🌐'}</span>
						<div class="sheet-opt-text">
							<span class="sheet-opt-name">{languageLabels[locale] ?? locale}</span>
							<span class="sheet-opt-desc">{languageDescs[locale] ?? ''}</span>
						</div>
						<span class="sheet-radio"></span>
					</button>
				{/each}
			</div>
			<button type="button" class="sheet-done" onclick={() => (settingsSheetOpen = false)}
				>Done</button
			>
		{:else if settingsSheetField === 'week'}
			<p class="sheet-sub">Used by calendars, the Finance week-strip, and weekly summaries.</p>
			<div class="sheet-picker">
				{#each weekDayOptions as opt (opt.value)}
					<button
						type="button"
						class="sheet-opt"
						class:active={weekStartDay === opt.value}
						onclick={() => (weekStartDay = opt.value)}
					>
						<span class="sheet-opt-icon">{opt.icon}</span>
						<div class="sheet-opt-text">
							<span class="sheet-opt-name">{opt.label}</span>
							<span class="sheet-opt-desc">{opt.desc}</span>
						</div>
						<span class="sheet-radio"></span>
					</button>
				{/each}
			</div>
			<button type="button" class="sheet-done" onclick={() => (settingsSheetOpen = false)}
				>Done</button
			>
		{:else if settingsSheetField === 'time-format'}
			<p class="sheet-sub">Coming soon.</p>
			<div class="sheet-picker">
				<button type="button" class="sheet-opt active" onclick={() => stubAction('time-format')}>
					<span class="sheet-opt-icon">🕐</span>
					<div class="sheet-opt-text">
						<span class="sheet-opt-name">24-hour</span>
						<span class="sheet-opt-desc">17:30</span>
					</div>
					<span class="sheet-radio"></span>
				</button>
				<button type="button" class="sheet-opt" style="opacity: 0.55; pointer-events: none;">
					<span class="sheet-opt-icon">🕧</span>
					<div class="sheet-opt-text">
						<span class="sheet-opt-name">12-hour</span>
						<span class="sheet-opt-desc">5:30 PM</span>
					</div>
					<span class="sheet-radio"></span>
				</button>
			</div>
			<div class="sheet-stub-notice">Time format setting coming soon.</div>
			<button type="button" class="sheet-done secondary" onclick={() => (settingsSheetOpen = false)}
				>Close</button
			>
		{:else if settingsSheetField === 'theme'}
			<p class="sheet-sub">Currently light-only — dark mode is on the maybe-later list.</p>
			<div class="sheet-picker">
				<button type="button" class="sheet-opt active" onclick={() => stubAction('theme')}>
					<span class="sheet-opt-icon">☀️</span>
					<div class="sheet-opt-text">
						<span class="sheet-opt-name">Light</span>
						<span class="sheet-opt-desc">The only one that exists, for now.</span>
					</div>
					<span class="sheet-radio"></span>
				</button>
				<button type="button" class="sheet-opt" style="opacity: 0.55; pointer-events: none;">
					<span class="sheet-opt-icon">🌙</span>
					<div class="sheet-opt-text">
						<span class="sheet-opt-name">Dark</span>
						<span class="sheet-opt-desc">Coming when it earns the bug count.</span>
					</div>
					<span class="sheet-radio"></span>
				</button>
				<button type="button" class="sheet-opt" style="opacity: 0.55; pointer-events: none;">
					<span class="sheet-opt-icon">💻</span>
					<div class="sheet-opt-text">
						<span class="sheet-opt-name">System</span>
						<span class="sheet-opt-desc">Will follow your iOS preference.</span>
					</div>
					<span class="sheet-radio"></span>
				</button>
			</div>
			<button type="button" class="sheet-done secondary" onclick={() => (settingsSheetOpen = false)}
				>Close</button
			>
		{:else if settingsSheetField === 'backups'}
			<p class="sheet-sub">Daily snapshot of every app's data.</p>
			<div class="sheet-stub-notice">Backup management coming soon.</div>
			<button type="button" class="sheet-done secondary" onclick={() => (settingsSheetOpen = false)}
				>Close</button
			>
		{:else if settingsSheetField === 'export'}
			<p class="sheet-sub">
				One zip with every app's data. Open it on your laptop with anything that reads JSON or CSV.
			</p>
			<div class="sheet-info">
				<b>What's inside:</b><br />
				· Finance · accounts, transactions, expenses, debts (CSV + JSON)<br />
				· Profile · your settings and locale<br />
				· Audit log · every change you've made
			</div>
			<div class="sheet-stub-notice">Export not yet available.</div>
			<button type="button" class="sheet-done secondary" onclick={() => (settingsSheetOpen = false)}
				>Close</button
			>
		{:else if settingsSheetField === 'audit'}
			<p class="sheet-sub">Every state-changing thing that's happened to your data.</p>
			<div class="sheet-stub-notice">Audit log viewer coming soon.</div>
			<button type="button" class="sheet-done secondary" onclick={() => (settingsSheetOpen = false)}
				>Close</button
			>
		{:else if settingsSheetField === 'sessions'}
			<SessionsSheet sessions={data.sessions} onclose={() => (settingsSheetOpen = false)} />
		{:else if settingsSheetField === 'signout'}
			<p class="sheet-sub">
				You'll be signed out from every Nexo app on this device. Your data stays where it is.
			</p>
			<div class="sheet-actions">
				<button
					type="button"
					class="sheet-btn-secondary"
					onclick={() => (settingsSheetOpen = false)}>Stay</button
				>
				<a href={`${env.PUBLIC_AUTH_URL}/signout`} class="sheet-btn-danger">Sign out</a>
			</div>
		{/if}
	</BottomSheet>

	<!-- Navigation guard -->
	{#if pendingNav}
		<div class="nav-guard">
			<div class="nav-guard-card">
				<p class="nav-guard-msg">You have unsaved changes.</p>
				<div class="nav-guard-actions">
					<button type="button" class="nav-guard-btn discard" onclick={pendingNav.proceed}
						>Discard</button
					>
					<button type="button" class="nav-guard-btn stay" onclick={() => (pendingNav = null)}
						>Stay</button
					>
				</div>
			</div>
		</div>
	{/if}
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
	.who .greeting b,
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

	/* ─── Section labels ─── */
	.sec {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 28px 4px 12px;
		gap: 12px;
	}
	.sec-title {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
		white-space: nowrap;
	}
	.sec-title b,
	.sec-title :global(b) {
		color: var(--color-text-primary);
		font-weight: 600;
		letter-spacing: 0.04em;
	}
	.sec-right {
		font-size: 12px;
		color: var(--color-text-faint);
		font-family: var(--font-mono);
		letter-spacing: 0.04em;
		white-space: nowrap;
		flex-shrink: 0;
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
	.footer-link {
		cursor: default;
		opacity: 0.6;
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
	.sheet-sub {
		font-size: 13px;
		color: var(--color-text-subtle);
		margin-top: 4px;
		line-height: 1.5;
	}
	.sheet-field {
		margin-top: 14px;
	}
	.sheet-field label {
		display: block;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
		margin-bottom: 6px;
	}
	.sheet-field input {
		width: 100%;
		height: 48px;
		padding: 0 14px;
		font: inherit;
		font-size: 15px;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		outline: none;
	}
	.sheet-field input:focus {
		border-color: var(--color-accent);
		background: var(--color-surface-1);
		box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-accent) 12%, transparent);
	}
	.sheet-hint {
		margin-top: 8px;
		font-size: 12px;
		color: var(--color-text-subtle);
		line-height: 1.5;
	}
	.sheet-info {
		margin-top: 14px;
		padding: 14px;
		background: var(--color-bg-1);
		border-radius: var(--radius-md);
		font-size: 13px;
		color: var(--color-text-muted);
		line-height: 1.6;
	}
	.sheet-stub-notice {
		margin-top: 14px;
		padding: 12px 14px;
		background: color-mix(in oklab, var(--color-accent) 6%, var(--color-bg-1));
		border: 1px dashed color-mix(in oklab, var(--color-accent) 20%, var(--color-border-subtle));
		border-radius: var(--radius-md);
		font-size: 12px;
		color: var(--color-text-subtle);
		text-align: center;
	}
	.sheet-picker {
		margin-top: 14px;
		display: flex;
		flex-direction: column;
		background: var(--color-bg-1);
		border-radius: var(--radius-md);
		overflow: hidden;
	}
	.sheet-opt {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 13px 14px;
		border: none;
		border-top: 1px solid var(--color-border-subtle);
		background: transparent;
		cursor: pointer;
		font: inherit;
		color: inherit;
		width: 100%;
		text-align: left;
		transition: background var(--duration-fast) var(--ease-out);
	}
	.sheet-opt:first-child {
		border-top: 0;
	}
	.sheet-opt:active {
		background: var(--color-bg-2);
	}
	.sheet-opt-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.sheet-opt-icon {
		width: 28px;
		height: 28px;
		border-radius: 7px;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-subtle);
		display: grid;
		place-items: center;
		font-size: 14px;
		flex-shrink: 0;
	}
	.sheet-opt-name {
		flex: 1;
		font-size: 14.5px;
		font-weight: 500;
		letter-spacing: -0.005em;
	}
	.sheet-opt.active .sheet-opt-name {
		color: color-mix(in oklab, var(--color-accent) 80%, #000);
	}
	.sheet-opt-desc {
		font-size: 11.5px;
		color: var(--color-text-subtle);
	}
	.sheet-radio {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		border: 2px solid var(--color-border-strong);
		flex-shrink: 0;
		position: relative;
		transition: border-color var(--duration-fast) var(--ease-out);
	}
	.sheet-opt.active .sheet-radio {
		border-color: var(--color-accent);
	}
	.sheet-opt.active .sheet-radio::after {
		content: '';
		position: absolute;
		inset: 3px;
		border-radius: 50%;
		background: var(--color-accent);
	}
	.sheet-done {
		width: 100%;
		height: 48px;
		margin-top: 16px;
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		border-radius: var(--radius-md);
		border: none;
		background: var(--color-accent);
		color: #fff;
		cursor: pointer;
	}
	.sheet-done:active {
		opacity: 0.85;
	}
	.sheet-done.secondary {
		background: var(--color-bg-1);
		color: var(--color-text-primary);
		border: 1px solid var(--color-border-default);
	}
	.sheet-actions {
		display: flex;
		gap: 10px;
		margin-top: 16px;
	}
	.sheet-btn-secondary {
		flex: 1;
		height: 48px;
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-1);
		color: var(--color-text-primary);
		cursor: pointer;
	}
	.sheet-btn-secondary:active {
		opacity: 0.85;
	}
	.sheet-btn-danger {
		flex: 1;
		height: 48px;
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		border-radius: var(--radius-md);
		border: none;
		background: oklch(0.59 0.2 27);
		color: #fff;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	.sheet-btn-danger:active {
		opacity: 0.85;
	}

	/* ─── Navigation guard ─── */
	.nav-guard {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: grid;
		place-items: center;
		background: rgb(0 0 0 / 0.3);
		backdrop-filter: blur(4px);
		padding: 24px;
		animation: fade-in var(--duration-fast) var(--ease-out);
	}
	.nav-guard-card {
		width: 100%;
		max-width: 300px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		padding: 24px 20px 20px;
		box-shadow: 0 16px 48px -12px rgb(0 0 0 / 0.15);
	}
	.nav-guard-msg {
		font-size: 15px;
		font-weight: 500;
		text-align: center;
		margin: 0 0 16px;
		color: var(--color-text-primary);
	}
	.nav-guard-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.nav-guard-btn {
		height: 42px;
		border-radius: var(--radius-md);
		border: none;
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: opacity var(--duration-fast) var(--ease-out);
	}
	.nav-guard-btn:active {
		opacity: 0.8;
	}
	.nav-guard-btn.discard {
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-default);
		color: var(--color-text-muted);
	}
	.nav-guard-btn.stay {
		background: var(--color-accent);
		color: #fff;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
