<script lang="ts">
	import { enhance } from '$app/forms';
	import { dev } from '$app/environment';
	import { env } from '$env/dynamic/public';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { m } from '$lib/paraglide/messages.js';
	import {
		AboutDiagnostics,
		BottomSheet,
		PageHeader,
		ProfileHubCard,
		SaveBar,
		SectionLabel,
		Toggle,
		UnsavedGuard
	} from '@nexo/ui';
	import UserAvatarMenu from '$lib/components/UserAvatarMenu.svelte';

	let { data } = $props();

	const currencies = $derived([
		{ code: 'EUR', symbol: '€', label: m.currency_eur_label() },
		{ code: 'USD', symbol: '$', label: m.currency_usd_label() },
		{ code: 'GBP', symbol: '£', label: m.currency_gbp_label() },
		{ code: 'CHF', symbol: 'Fr', label: m.currency_chf_label() },
		{ code: 'TRY', symbol: '₺', label: m.currency_try_label() }
	]);

	const forecastWindows = $derived([
		{ value: '30', label: m.forecast_window_30(), desc: m.forecast_window_30_desc() },
		{ value: '60', label: m.forecast_window_60(), desc: m.forecast_window_60_desc() },
		{ value: '90', label: m.forecast_window_90(), desc: m.forecast_window_90_desc() },
		{ value: '180', label: m.forecast_window_180(), desc: m.forecast_window_180_desc() }
	]);

	const languageLabels: Record<string, string> = {
		en: 'English',
		de: 'Deutsch',
		tr: 'Türkçe'
	};

	const weekStartLabels: Record<string, string> = $derived({
		monday: m.week_starts_monday(),
		sunday: m.week_starts_sunday(),
		saturday: m.week_starts_saturday()
	});

	const themeLabels: Record<string, string> = $derived({
		system: m.theme_system(),
		light: m.theme_light(),
		dark: m.theme_dark()
	});

	const defaultEmoji: Record<string, string> = {
		checking: '🏦',
		savings: '💰',
		investment: '📈',
		crypto: '₿',
		cash: '💵'
	};

	let selectedCurrency = $state('EUR');
	let selectedDefaultAccount = $state('');
	let hideCents = $state(false);
	let forecastWindow = $state('90');
	let includeDebt = $state(true);

	let currencySheetOpen = $state(false);
	let accountSheetOpen = $state(false);
	let forecastSheetOpen = $state(false);
	let excludedSheetOpen = $state(false);

	let accountsState = $state<
		{
			id: string;
			name: string;
			type: string;
			emoji: string | null;
			balance: number;
			includeInTotal: boolean;
		}[]
	>([]);

	$effect(() => {
		selectedCurrency = data.currency ?? 'EUR';
		selectedDefaultAccount = data.defaultAccountId ?? '';
		hideCents = data.hideCents ?? false;
		forecastWindow = data.forecastDays ?? '90';
		includeDebt = data.includeDebtInForecast ?? true;
		accountsState = data.accounts.map(
			(a: {
				id: string;
				name: string;
				type: string;
				emoji: string | null;
				balance: number;
				includeInTotal: boolean;
			}) => ({ ...a })
		);
	});

	const dirty = $derived(
		selectedCurrency !== (data.currency ?? 'EUR') ||
			selectedDefaultAccount !== (data.defaultAccountId ?? '') ||
			hideCents !== (data.hideCents ?? false) ||
			forecastWindow !== (data.forecastDays ?? '90') ||
			includeDebt !== (data.includeDebtInForecast ?? true)
	);

	const currentLocale = getLocale();
	const currentCurrency = $derived(currencies.find((c) => c.code === selectedCurrency));
	const currentForecast = $derived(forecastWindows.find((f) => f.value === forecastWindow));
	const selectedAccount = $derived(
		data.accounts.find((a: { id: string }) => a.id === selectedDefaultAccount)
	);
	const excludedCount = $derived(accountsState.filter((a) => !a.includeInTotal).length);
	const liquidTotal = $derived(
		accountsState.filter((a) => a.includeInTotal).reduce((s, a) => s + a.balance, 0)
	);

	function fmtBalance(amount: number): string {
		const sym = currentCurrency?.symbol ?? '€';
		return `${sym}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	}

	// ─── Navigation guard ────────────────────────────────────────────────────
	function discardChanges() {
		selectedCurrency = data.currency ?? 'EUR';
		selectedDefaultAccount = data.defaultAccountId ?? '';
		hideCents = data.hideCents ?? false;
		forecastWindow = data.forecastDays ?? '90';
		includeDebt = data.includeDebtInForecast ?? true;
	}

	const hubUrl = $derived(
		env.PUBLIC_LANDING_URL
			? `${env.PUBLIC_LANDING_URL}/apps`
			: dev
				? 'http://localhost:3000/apps'
				: 'https://krieger2501.de/apps'
	);
</script>

<div class="page">
	<PageHeader title={m.settings_page_title()} subtitle={m.settings_page_subtitle()}>
		{#snippet avatar()}<UserAvatarMenu />{/snippet}
	</PageHeader>

	<!-- ─── Profile (read-only — managed in hub) ─── -->
	<ProfileHubCard
		name={data.profile.name}
		email={data.profile.email}
		{hubUrl}
		displayName={data.profile.displayName}
		language={languageLabels[currentLocale] ?? currentLocale}
		weekStarts={weekStartLabels[data.profile.weekStartDay] ?? m.week_starts_monday()}
		theme={themeLabels[data.profile.theme] ?? data.profile.theme}
	/>

	<!-- ─── Finance — app-specific (editable) ─── -->
	<SectionLabel title={m.settings_section_finance()} subtitle={m.settings_section_finance_subtitle()} />

	<form
		id="settings-form"
		method="POST"
		action="?/save"
		use:enhance={() => {
			return async ({ update }) => {
				await update({ reset: false });
			};
		}}
		class="form"
	>
		<div class="set-card">
			<div class="set-scope"><b>{m.settings_card_money_basics()}</b></div>

			<!-- Currency -->
			<button type="button" class="set-row" onclick={() => (currencySheetOpen = true)}>
				<div class="sr-icon">{currentCurrency?.symbol ?? '€'}</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_currency()}</div>
					<div class="sr-desc">{m.settings_currency_desc()}</div>
				</div>
				<div class="sr-value">{selectedCurrency} · {currentCurrency?.symbol ?? ''}</div>
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

			<!-- Default account -->
			<button type="button" class="set-row" onclick={() => (accountSheetOpen = true)}>
				<div class="sr-icon">
					{selectedAccount
						? selectedAccount.emoji || defaultEmoji[selectedAccount.type] || '🏦'
						: '🏦'}
				</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_default_account()}</div>
					<div class="sr-desc">{m.settings_default_account_desc()}</div>
				</div>
				<div class="sr-value">{selectedAccount?.name ?? m.common_none()}</div>
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

			<!-- Hide cents -->
			<div class="set-row" style="cursor: default">
				<div class="sr-icon">,0</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_hide_cents()}</div>
					<div class="sr-desc">{m.settings_hide_cents_desc()}</div>
				</div>
				<div class="sr-toggle">
					<Toggle bind:checked={hideCents} ariaLabel={m.settings_hide_cents()} />
				</div>
			</div>
		</div>

		<div class="set-card">
			<div class="set-scope"><b>{m.settings_card_forecast_flows()}</b></div>

			<!-- Excluded from liquid -->
			<button type="button" class="set-row" onclick={() => (excludedSheetOpen = true)}>
				<div class="sr-icon">⊘</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_excluded_from_liquid()}</div>
					<div class="sr-desc">{m.settings_excluded_from_liquid_desc()}</div>
				</div>
				<div class="sr-value">
					{excludedCount === 1
						? m.settings_excluded_count_one({ count: excludedCount })
						: m.settings_excluded_count_other({ count: excludedCount })}
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

			<!-- Forecast window -->
			<button type="button" class="set-row" onclick={() => (forecastSheetOpen = true)}>
				<div class="sr-icon">📈</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_forecast_window()}</div>
				</div>
				<div class="sr-value">{currentForecast?.label ?? m.forecast_window_90()}</div>
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

			<!-- Include debt in forecast -->
			<div class="set-row" style="cursor: default">
				<div class="sr-icon">⇄</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_include_debt()}</div>
					<div class="sr-desc">{m.settings_include_debt_desc()}</div>
				</div>
				<div class="sr-toggle">
					<Toggle bind:checked={includeDebt} ariaLabel={m.settings_include_debt()} />
				</div>
			</div>
		</div>

		<div class="set-card">
			<div class="set-scope"><b>{m.settings_card_organize()}</b></div>

			<!-- Categories (stub) -->
			<button type="button" class="set-row stub-row" onclick={() => {}}>
				<div class="sr-icon">🏷</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_categories()}</div>
					<div class="sr-desc">{m.settings_categories_desc()}</div>
				</div>
				<div class="sr-value stub-value">7</div>
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

			<!-- Export (stub) -->
			<button type="button" class="set-row stub-row" onclick={() => {}}>
				<div class="sr-icon">↓</div>
				<div class="sr-text">
					<div class="sr-label">{m.settings_export()}</div>
					<div class="sr-desc">{m.settings_export_desc()}</div>
				</div>
				<div class="sr-value stub-value">.csv</div>
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

		<input type="hidden" name="currency" value={selectedCurrency} />
		<input type="hidden" name="defaultAccountId" value={selectedDefaultAccount} />
		<input type="hidden" name="hideCents" value={hideCents} />
		<input type="hidden" name="forecastDays" value={forecastWindow} />
		<input type="hidden" name="includeDebtInForecast" value={includeDebt} />
	</form>

	<!-- ─── Sign out ─── -->
	<div class="set-card" style="margin-top: 20px">
		<a class="set-row danger-row" href={`${env.PUBLIC_AUTH_URL ?? ''}/signout`}>
			<div class="sr-icon">⎋</div>
			<div class="sr-text">
				<div class="sr-label">{m.settings_signout()}</div>
				<div class="sr-desc">{m.settings_signout_desc()}</div>
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
		</a>
	</div>

	<footer class="footer-spacer"></footer>

	<AboutDiagnostics
		appName="Nexo Finance"
		appKey="finance"
		version={data.appMeta.version}
		commit={data.appMeta.commit}
		buildTime={data.appMeta.buildTime}
		email={data.diagnostics.email}
		userId={data.diagnostics.userId}
		correlationId={data.diagnostics.correlationId}
	/>
</div>

<!-- ─── Sticky save bar ─── -->
<SaveBar visible={dirty} hint={m.common_unsaved_changes()} label={m.common_save()} formId="settings-form" />

<!-- ─── Currency sheet ─── -->
<BottomSheet
	bind:open={currencySheetOpen}
	title={m.settings_currency()}
	subtitle={m.settings_currency_sheet_subtitle()}
>
	<div class="sheet-picker">
		{#each currencies as c (c.code)}
			<button
				type="button"
				class="sheet-opt"
				class:active={selectedCurrency === c.code}
				onclick={() => {
					selectedCurrency = c.code;
				}}
			>
				<span class="sheet-opt-icon">{c.symbol}</span>
				<span class="sheet-opt-text">
					<span class="sheet-opt-name">{c.label}</span>
					<span class="sheet-opt-desc">{c.code}</span>
				</span>
				<span class="sheet-radio"></span>
			</button>
		{/each}
	</div>
	<div class="sheet-actions">
		<button type="button" class="sheet-done" onclick={() => (currencySheetOpen = false)}
			>{m.common_done()}</button
		>
	</div>
</BottomSheet>

<!-- ─── Default account sheet ─── -->
<BottomSheet
	bind:open={accountSheetOpen}
	title={m.settings_default_account()}
	subtitle={m.settings_default_account_sheet_subtitle()}
>
	<div class="sheet-picker">
		<button
			type="button"
			class="sheet-opt"
			class:active={!selectedDefaultAccount}
			onclick={() => {
				selectedDefaultAccount = '';
			}}
		>
			<span class="sheet-opt-icon">—</span>
			<span class="sheet-opt-text">
				<span class="sheet-opt-name">{m.common_none()}</span>
				<span class="sheet-opt-desc">{m.common_no_default()}</span>
			</span>
			<span class="sheet-radio"></span>
		</button>
		{#each data.accounts as account (account.id)}
			<button
				type="button"
				class="sheet-opt"
				class:active={selectedDefaultAccount === account.id}
				onclick={() => {
					selectedDefaultAccount = account.id;
				}}
			>
				<span class="sheet-opt-icon">{account.emoji || defaultEmoji[account.type] || '🏦'}</span>
				<span class="sheet-opt-text">
					<span class="sheet-opt-name">{account.name}</span>
					<span class="sheet-opt-desc">{fmtBalance(account.balance)} · {account.type}</span>
				</span>
				<span class="sheet-radio"></span>
			</button>
		{/each}
	</div>
	<div class="sheet-actions">
		<button type="button" class="sheet-done" onclick={() => (accountSheetOpen = false)}>{m.common_done()}</button
		>
	</div>
</BottomSheet>

<!-- ─── Forecast window sheet ─── -->
<BottomSheet
	bind:open={forecastSheetOpen}
	title={m.settings_forecast_window()}
	subtitle={m.settings_forecast_window_sheet_subtitle()}
>
	<div class="sheet-picker">
		{#each forecastWindows as fw (fw.value)}
			<button
				type="button"
				class="sheet-opt"
				class:active={forecastWindow === fw.value}
				onclick={() => {
					forecastWindow = fw.value;
				}}
			>
				<span class="sheet-opt-icon">{fw.value === '180' ? '½y' : fw.value}</span>
				<span class="sheet-opt-text">
					<span class="sheet-opt-name">{fw.label}</span>
					<span class="sheet-opt-desc">{fw.desc}</span>
				</span>
				<span class="sheet-radio"></span>
			</button>
		{/each}
	</div>
	<div class="sheet-actions">
		<button type="button" class="sheet-done" onclick={() => (forecastSheetOpen = false)}
			>{m.common_done()}</button
		>
	</div>
</BottomSheet>

<!-- ─── Excluded from liquid sheet ─── -->
<BottomSheet
	bind:open={excludedSheetOpen}
	title={m.settings_excluded_from_liquid()}
	subtitle={m.settings_excluded_from_liquid_sheet_subtitle()}
>
	<div class="excluded-card">
		{#each accountsState as account (account.id)}
			<form
				method="POST"
				action="?/toggleLiquid"
				use:enhance={() => {
					const idx = accountsState.findIndex((a) => a.id === account.id);
					if (idx >= 0) accountsState[idx].includeInTotal = !accountsState[idx].includeInTotal;
					return async ({ update }) => {
						await update({ reset: false, invalidateAll: false });
					};
				}}
			>
				<input type="hidden" name="accountId" value={account.id} />
				<input type="hidden" name="include" value={String(!account.includeInTotal)} />
				<button type="submit" class="excluded-row">
					<span class="excluded-emoji">{account.emoji || defaultEmoji[account.type] || '🏦'}</span>
					<span class="excluded-info">
						<span class="excluded-name">{account.name}</span>
						<span class="excluded-meta">{fmtBalance(account.balance)} · {account.type}</span>
					</span>
					<span class="excluded-toggle">
						<span
							class="toggle"
							class:on={!account.includeInTotal}
							role="switch"
							aria-checked={!account.includeInTotal}
						>
							<span class="toggle-thumb" class:on={!account.includeInTotal}></span>
						</span>
					</span>
				</button>
			</form>
		{/each}
	</div>
	<p class="excluded-hint">
		{m.settings_excluded_hint({ amount: fmtBalance(liquidTotal) })}
	</p>
	<div class="sheet-actions">
		<button type="button" class="sheet-done" onclick={() => (excludedSheetOpen = false)}
			>{m.common_done()}</button
		>
	</div>
</BottomSheet>

<!-- ─── Unsaved changes confirmation ─── -->
<UnsavedGuard {dirty} formId="settings-form" onDiscard={discardChanges} />

<style>
	.page {
		padding: 4px 16px 16px;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	/* ─── Excluded sheet ─── */
	.excluded-card {
		background: var(--color-bg-1);
		border-radius: var(--radius-md);
		overflow: hidden;
		margin-bottom: 10px;
	}
	.excluded-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border: none;
		background: transparent;
		font: inherit;
		text-align: left;
		cursor: pointer;
		width: 100%;
		border-bottom: 1px solid var(--color-border-subtle);
	}
	.excluded-row:last-child {
		border-bottom: none;
	}
	.excluded-emoji {
		font-size: 18px;
		width: 28px;
		text-align: center;
		flex-shrink: 0;
	}
	.excluded-info {
		flex: 1;
		min-width: 0;
	}
	.excluded-name {
		display: block;
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-primary);
	}
	.excluded-meta {
		display: block;
		font-size: 12px;
		color: var(--color-text-subtle);
		margin-top: 1px;
	}
	.excluded-toggle {
		flex-shrink: 0;
	}
	.excluded-hint {
		font-size: 12px;
		color: var(--color-text-subtle);
		margin: 0 0 14px;
		line-height: 1.5;
	}
	.excluded-highlight {
		color: var(--color-text-primary);
		font-weight: 600;
	}

	/* ─── Stub rows ─── */
	.stub-row {
		opacity: 0.55;
		cursor: default;
	}
	.stub-row:active {
		background: transparent;
	}
	.stub-value {
		font-family: var(--font-mono);
		letter-spacing: 0.04em;
	}

	/* ─── Danger row ─── */
	.danger-row .sr-label {
		color: oklch(0.59 0.2 27);
	}
	.danger-row .sr-icon {
		background: oklch(0.95 0.04 27);
		color: oklch(0.59 0.2 27);
	}

	/* ─── Footer ─── */
	.footer-spacer {
		display: block;
		height: 12px;
	}
</style>
