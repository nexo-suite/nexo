<script lang="ts">
	import { enhance } from '$app/forms';
	import { beforeNavigate, goto } from '$app/navigation';
	import { env } from '$env/dynamic/public';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import BottomSheet from '$lib/components/layout/BottomSheet.svelte';

	let { data, form: _form } = $props();

	const currencies = [
		{ code: 'EUR', symbol: '€', label: 'Euro' },
		{ code: 'USD', symbol: '$', label: 'Dollar' },
		{ code: 'GBP', symbol: '£', label: 'Pound' },
		{ code: 'CHF', symbol: 'Fr', label: 'Franc' },
		{ code: 'TRY', symbol: '₺', label: 'Lira' }
	];

	const forecastWindows = [
		{ value: '30', label: '30 days', desc: 'Just the next month' },
		{ value: '60', label: '60 days', desc: 'Two salary cycles' },
		{ value: '90', label: '90 days', desc: 'Recommended · catches most one-times' },
		{ value: '180', label: '180 days', desc: 'Half a year · less precise late' }
	];

	const languageLabels: Record<string, string> = {
		en: 'English',
		de: 'Deutsch',
		tr: 'Türkçe'
	};

	const weekLabels: Record<string, string> = {
		monday: 'Monday',
		sunday: 'Sunday'
	};

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

	const initials = $derived(
		(data.displayName || data.user?.name || 'U')
			.split(' ')
			.map((w: string) => w[0])
			.join('')
			.slice(0, 2)
			.toUpperCase()
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
	let unsavedSheetOpen = $state(false);
	let pendingNavUrl = $state<string | null>(null);

	beforeNavigate(({ cancel, to, type }) => {
		if (type === 'form') return;
		if (dirty && !unsavedSheetOpen) {
			cancel();
			pendingNavUrl = to?.url.pathname ?? null;
			unsavedSheetOpen = true;
		}
	});

	function discardAndGo() {
		// Reset to original values so dirty becomes false and beforeNavigate won't block
		selectedCurrency = data.currency ?? 'EUR';
		selectedDefaultAccount = data.defaultAccountId ?? '';
		hideCents = data.hideCents ?? false;
		forecastWindow = data.forecastDays ?? '90';
		includeDebt = data.includeDebtInForecast ?? true;
		unsavedSheetOpen = false;
		if (pendingNavUrl) {
			goto(pendingNavUrl);
		}
	}

	const hubUrl = $derived(
		env.PUBLIC_LANDING_URL ? `${env.PUBLIC_LANDING_URL}/apps` : 'https://krieger2501.de/apps'
	);
</script>

<div class="page">
	<div class="header">
		<h1 class="title">Settings</h1>
		<p class="subtitle">Finance-specific knobs live here. Everything global is in the hub.</p>
	</div>

	<!-- ─── Profile (read-only — managed in hub) ─── -->
	<div class="section-label">
		<span class="sl-title"><b>Profile</b> · global</span>
		<span class="sl-right">read-only</span>
	</div>

	<div class="set-card ro-card">
		<div class="profile-row">
			<div
				class="avatar"
				style="background: linear-gradient(135deg, var(--color-accent), color-mix(in oklab, var(--color-accent) 50%, #000));"
			>
				{initials}
			</div>
			<div class="profile-info">
				<div class="profile-name">{data.displayName || data.user?.name || 'Set name'}</div>
				<div class="profile-email">{data.user?.email ?? ''}</div>
			</div>
			<span class="ro-badge">managed in hub</span>
		</div>

		<div class="set-scope"><b>Identity & locale</b></div>
		<div class="set-row ro-row" data-readonly>
			<div class="sr-icon">@</div>
			<div class="sr-text"><div class="sr-label">Display name</div></div>
			<div class="sr-value">{data.displayName || '—'}</div>
		</div>
		<div class="set-row ro-row" data-readonly>
			<div class="sr-icon">🌐</div>
			<div class="sr-text"><div class="sr-label">Language</div></div>
			<div class="sr-value">{languageLabels[currentLocale] ?? currentLocale}</div>
		</div>
		<div class="set-row ro-row" data-readonly>
			<div class="sr-icon">📅</div>
			<div class="sr-text"><div class="sr-label">Week starts</div></div>
			<div class="sr-value">{weekLabels[data.weekStartDay ?? 'monday'] ?? 'Monday'}</div>
		</div>
		<div class="set-row ro-row" data-readonly>
			<div class="sr-icon">☀</div>
			<div class="sr-text"><div class="sr-label">Theme</div></div>
			<div class="sr-value">Light</div>
		</div>

		<a class="manage-cta" href={hubUrl}>
			<div class="manage-text">
				<b>Manage in hub</b>
				<span>One place to change your name, language, and sessions.</span>
			</div>
			<span class="manage-arrow">
				Open
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg
				>
			</span>
		</a>
	</div>

	<!-- ─── Finance — app-specific (editable) ─── -->
	<div class="section-label">
		<span class="sl-title"><b>Finance</b> · just this app</span>
		<span class="sl-right">v{__APP_VERSION__}</span>
	</div>

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
			<div class="set-scope"><b>Money basics</b></div>

			<!-- Currency -->
			<button type="button" class="set-row" onclick={() => (currencySheetOpen = true)}>
				<div class="sr-icon">{currentCurrency?.symbol ?? '€'}</div>
				<div class="sr-text">
					<div class="sr-label">Currency</div>
					<div class="sr-desc">Display only — no conversions.</div>
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
					<div class="sr-label">Default account</div>
					<div class="sr-desc">New expenses suggest this account first.</div>
				</div>
				<div class="sr-value">{selectedAccount?.name ?? 'None'}</div>
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
					<div class="sr-label">Hide cents</div>
					<div class="sr-desc">Round to nearest euro everywhere.</div>
				</div>
				<div class="sr-toggle">
					<button
						type="button"
						role="switch"
						aria-checked={hideCents}
						aria-label="Hide cents"
						onclick={() => (hideCents = !hideCents)}
						class="toggle"
						class:on={hideCents}
					>
						<span class="toggle-thumb" class:on={hideCents}></span>
					</button>
				</div>
			</div>
		</div>

		<div class="set-card">
			<div class="set-scope"><b>Forecast & flows</b></div>

			<!-- Excluded from liquid -->
			<button type="button" class="set-row" onclick={() => (excludedSheetOpen = true)}>
				<div class="sr-icon">⊘</div>
				<div class="sr-text">
					<div class="sr-label">Excluded from liquid</div>
					<div class="sr-desc">Crypto & locked balances skip the dashboard hero.</div>
				</div>
				<div class="sr-value">{excludedCount} acct{excludedCount !== 1 ? 's' : ''}</div>
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
					<div class="sr-label">Forecast window</div>
				</div>
				<div class="sr-value">{currentForecast?.label ?? '90 days'}</div>
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
					<div class="sr-label">Include debt in forecast</div>
					<div class="sr-desc">Open debts dent or lift the projection.</div>
				</div>
				<div class="sr-toggle">
					<button
						type="button"
						role="switch"
						aria-checked={includeDebt}
						aria-label="Include debt in forecast"
						onclick={() => (includeDebt = !includeDebt)}
						class="toggle"
						class:on={includeDebt}
					>
						<span class="toggle-thumb" class:on={includeDebt}></span>
					</button>
				</div>
			</div>
		</div>

		<div class="set-card">
			<div class="set-scope"><b>Organize</b></div>

			<!-- Categories (stub) -->
			<button type="button" class="set-row stub-row" onclick={() => {}}>
				<div class="sr-icon">🏷</div>
				<div class="sr-text">
					<div class="sr-label">Categories</div>
					<div class="sr-desc">housing · utility · subscription · …</div>
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
					<div class="sr-label">Export Finance data</div>
					<div class="sr-desc">CSV of transactions, accounts, debts.</div>
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
				<div class="sr-label">Sign out</div>
				<div class="sr-desc">Out of all Nexo apps. You can sign back in any time.</div>
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

	<footer class="footer">
		NEXO FINANCE · v{__APP_VERSION__} ·
		<a class="footer-link" href={env.PUBLIC_LANDING_URL ?? '/'}>privacy</a>
	</footer>
</div>

<!-- ─── Sticky save bar ─── -->
<div class="save-bar" class:visible={dirty}>
	<div class="save-bar-inner">
		<span class="save-bar-hint">Unsaved changes</span>
		<button type="submit" form="settings-form" class="save-bar-btn">Save</button>
	</div>
</div>

<!-- ─── Currency sheet ─── -->
<BottomSheet
	bind:open={currencySheetOpen}
	title="Currency"
	subtitle="Display only — amounts stay as-is, no conversions."
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
			>Done</button
		>
	</div>
</BottomSheet>

<!-- ─── Default account sheet ─── -->
<BottomSheet
	bind:open={accountSheetOpen}
	title="Default account"
	subtitle="Pre-selected when adding new flows."
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
				<span class="sheet-opt-name">None</span>
				<span class="sheet-opt-desc">No default</span>
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
		<button type="button" class="sheet-done" onclick={() => (accountSheetOpen = false)}>Done</button
		>
	</div>
</BottomSheet>

<!-- ─── Forecast window sheet ─── -->
<BottomSheet
	bind:open={forecastSheetOpen}
	title="Forecast window"
	subtitle="How far ahead the trajectory projects on the dashboard and forecast screen."
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
			>Done</button
		>
	</div>
</BottomSheet>

<!-- ─── Excluded from liquid sheet ─── -->
<BottomSheet
	bind:open={excludedSheetOpen}
	title="Excluded from liquid"
	subtitle="Excluded accounts stay visible but skip the dashboard hero, forecast, and the savings rate."
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
		Toggled-on accounts skip the <b class="excluded-highlight">{fmtBalance(liquidTotal)}</b> liquid total.
	</p>
	<div class="sheet-actions">
		<button type="button" class="sheet-done" onclick={() => (excludedSheetOpen = false)}
			>Done</button
		>
	</div>
</BottomSheet>

<!-- ─── Unsaved changes confirmation ─── -->
<BottomSheet
	bind:open={unsavedSheetOpen}
	title="Unsaved changes"
	subtitle="You have settings that haven't been saved yet."
>
	<div class="unsaved-actions">
		<button
			type="submit"
			form="settings-form"
			class="unsaved-btn save"
			onclick={() => (unsavedSheetOpen = false)}>Save & stay</button
		>
		<button type="button" class="unsaved-btn discard" onclick={discardAndGo}>Discard & leave</button
		>
	</div>
</BottomSheet>

<style>
	.page {
		padding: 4px 16px 16px;
	}

	.header {
		padding: 4px 2px 16px;
	}

	.title {
		font-size: 26px;
		font-weight: 600;
		letter-spacing: -0.025em;
		margin: 0;
	}

	.subtitle {
		font-size: 13px;
		color: var(--color-text-subtle);
		margin: 4px 0 0;
	}

	.form {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	/* ─── Section labels ─── */
	.section-label {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 24px 4px 10px;
		gap: 12px;
	}
	.sl-title {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-subtle);
		white-space: nowrap;
	}
	.sl-title b {
		color: var(--color-text-primary);
		font-weight: 600;
		letter-spacing: 0.04em;
	}
	.sl-right {
		font-size: 12px;
		color: var(--color-text-faint);
		font-family: var(--font-mono);
		letter-spacing: 0.04em;
		white-space: nowrap;
		flex-shrink: 0;
	}

	/* ─── Read-only card variant ─── */
	.ro-card {
		border-style: dashed;
		background: var(--color-bg-1);
	}
	.ro-row {
		cursor: default;
	}
	.ro-row:active {
		background: transparent;
	}
	.ro-row .sr-icon {
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-subtle);
	}
	.ro-row .sr-label {
		color: var(--color-text-muted);
	}
	.ro-row .sr-value {
		color: var(--color-text-subtle);
	}

	/* ─── Profile row ─── */
	.profile-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		position: relative;
		background: var(--color-surface-1);
		border-bottom: 1px dashed var(--color-border-default);
	}
	.avatar {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		flex-shrink: 0;
	}
	.profile-info {
		min-width: 0;
		flex: 1;
	}
	.profile-name {
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.015em;
	}
	.profile-email {
		font-size: 12px;
		color: var(--color-text-subtle);
		margin-top: 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ro-badge {
		font-family: var(--font-mono);
		font-size: 9px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 3px 7px;
		border-radius: 999px;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-subtle);
		color: var(--color-text-faint);
		flex-shrink: 0;
	}

	/* ─── Manage CTA ─── */
	.manage-cta {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		border-top: 1px dashed var(--color-border-default);
		background: var(--color-surface-1);
		text-decoration: none;
		color: inherit;
		transition: background var(--dur-fast, 150ms) var(--ease-out);
	}
	.manage-cta:active {
		background: var(--color-surface-2);
	}
	.manage-text {
		flex: 1;
		min-width: 0;
	}
	.manage-text b {
		display: block;
		font-size: 13.5px;
		font-weight: 600;
		color: color-mix(in oklab, var(--color-accent) 80%, #000);
	}
	.manage-text span {
		display: block;
		font-size: 11.5px;
		color: var(--color-text-subtle);
		margin-top: 2px;
		line-height: 1.4;
	}
	.manage-arrow {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-accent);
		flex-shrink: 0;
	}
	.manage-arrow svg {
		width: 14px;
		height: 14px;
		stroke-width: 2;
	}

	/* ─── Toggle ─── */
	.sr-toggle {
		flex-shrink: 0;
	}
	.toggle {
		position: relative;
		width: 44px;
		height: 26px;
		border-radius: 13px;
		border: none;
		background: var(--color-bg-2);
		cursor: pointer;
		transition: background var(--dur-fast, 150ms) var(--ease-out);
	}
	.toggle.on {
		background: var(--color-accent);
	}
	.toggle-thumb {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
		transition: left var(--dur-fast, 150ms) var(--ease-out);
	}
	.toggle-thumb.on {
		left: 21px;
	}

	/* ─── Sticky save bar ─── */
	.save-bar {
		position: fixed;
		bottom: calc(var(--tab-h, 76px) + 6px + 12px);
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		max-width: var(--max-w, 448px);
		padding: 0 16px;
		z-index: 45;
		pointer-events: none;
		opacity: 0;
		translate: 0 12px;
		transition:
			opacity var(--dur-base, 240ms) var(--ease-out),
			translate var(--dur-base, 240ms) var(--ease-out);
	}
	.save-bar.visible {
		opacity: 1;
		translate: 0 0;
		pointer-events: auto;
	}
	.save-bar-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px 10px 16px;
		background: var(--color-text-primary);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: var(--radius-lg, 16px);
		box-shadow: 0 4px 24px -4px rgb(0 0 0 / 0.18);
	}
	.save-bar-hint {
		font-size: 13px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.7);
	}
	.save-bar-btn {
		padding: 10px 20px;
		font: inherit;
		font-size: 14px;
		font-weight: 600;
		border-radius: var(--radius-md);
		border: none;
		background: #fff;
		color: var(--color-text-primary);
		cursor: pointer;
		flex-shrink: 0;
		transition: opacity var(--dur-fast, 150ms) var(--ease-out);
	}
	.save-bar-btn:active {
		opacity: 0.85;
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

	/* ─── Sheet Done button ─── */
	.sheet-actions {
		padding: 14px 0 4px;
	}
	.sheet-done {
		width: 100%;
		height: 48px;
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		border-radius: var(--radius-md);
		border: none;
		background: var(--color-accent);
		color: #fff;
		cursor: pointer;
		transition: opacity var(--dur-fast, 150ms) var(--ease-out);
	}
	.sheet-done:active {
		opacity: 0.85;
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
	.footer {
		padding: 16px 0 0;
		text-align: center;
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.04em;
		color: var(--color-text-faint);
	}
	.footer-link {
		color: var(--color-text-subtle);
		text-decoration: none;
	}
	.footer-link:hover {
		text-decoration: underline;
	}

	/* ─── Unsaved navigation sheet ─── */
	.unsaved-actions {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.unsaved-btn {
		width: 100%;
		height: 48px;
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		border-radius: var(--radius-md);
		border: none;
		cursor: pointer;
		transition: opacity var(--dur-fast, 150ms) var(--ease-out);
	}
	.unsaved-btn:active {
		opacity: 0.85;
	}
	.unsaved-btn.save {
		background: var(--color-accent);
		color: #fff;
	}
	.unsaved-btn.discard {
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-default);
		color: var(--color-text-muted);
	}
</style>
