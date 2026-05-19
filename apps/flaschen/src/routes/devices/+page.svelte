<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { BottomSheet } from '@nexo/ui';
	import {
		enableNotifications,
		disableNotifications,
		getPermissionState,
		sendTest,
		isStandalone,
		type PermissionState
	} from '@nexo/push/client';
	import { Bell, BellOff, Send, Trash2, Pencil } from '@lucide/svelte';

	let { data } = $props();

	let permState = $state<PermissionState>('default');
	let standalone = $state(true);
	let busy = $state(false);
	let renamingId = $state<string | null>(null);
	let renameLabel = $state('');
	let renameSheetOpen = $state(false);

	onMount(async () => {
		permState = await getPermissionState();
		standalone = isStandalone();
	});

	async function onEnable() {
		if (busy) return;
		busy = true;
		try {
			const r = await enableNotifications({
				app: 'flaschen',
				vapidPublicKey: data.vapidPublicKey,
				label: defaultDeviceLabel()
			});
			permState = await getPermissionState();
			if (r.ok) await invalidateAll();
		} finally {
			busy = false;
		}
	}

	async function onDisable() {
		if (busy) return;
		busy = true;
		try {
			await disableNotifications();
			permState = await getPermissionState();
			await invalidateAll();
		} finally {
			busy = false;
		}
	}

	async function onTest() {
		if (busy) return;
		busy = true;
		try {
			await sendTest();
		} finally {
			busy = false;
		}
	}

	function startRename(id: string, current: string | null) {
		renamingId = id;
		renameLabel = current ?? '';
		renameSheetOpen = true;
	}

	function defaultDeviceLabel(): string {
		const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
		return defaultLabelFromUA(ua);
	}

	function defaultLabelFromUA(ua: string | null): string {
		if (!ua) return 'Device';
		if (/iPhone/i.test(ua)) return 'iPhone';
		if (/iPad/i.test(ua)) return 'iPad';
		if (/Android/i.test(ua)) return 'Android';
		if (/Mac/i.test(ua)) return 'Mac';
		if (/Windows/i.test(ua)) return 'Windows';
		return 'Browser';
	}

	function deviceEmoji(ua: string | null): string {
		if (!ua) return '📱';
		if (/iPhone|Android/i.test(ua)) return '📱';
		if (/iPad/i.test(ua)) return '📲';
		if (/Mac|Windows|Linux/i.test(ua)) return '💻';
		return '📱';
	}

	function focusOnMount(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	function formatRelative(d: Date | string | null): string {
		if (!d) return '—';
		const ms = Date.now() - new Date(d).getTime();
		const min = Math.round(ms / 60000);
		if (min < 1) return 'just now';
		if (min < 60) return `${min} min ago`;
		const h = Math.round(min / 60);
		if (h < 24) return `${h} h ago`;
		return `${Math.round(h / 24)} d ago`;
	}

	const statusInfo = $derived.by(() => {
		switch (permState) {
			case 'granted':
				return {
					tone: 'ok' as const,
					icon: 'on' as const,
					title: 'Notifications on',
					desc: 'This device will receive push alerts for new shifts.'
				};
			case 'denied':
				return {
					tone: 'err' as const,
					icon: 'off' as const,
					title: 'Notifications blocked',
					desc: m.devices_denied()
				};
			case 'unsupported':
				return {
					tone: 'warn' as const,
					icon: 'off' as const,
					title: 'Not supported here',
					desc: m.devices_unsupported()
				};
			default:
				return {
					tone: 'idle' as const,
					icon: 'off' as const,
					title: 'Notifications off',
					desc: 'Allow push to get a ping when a matching shift appears.'
				};
		}
	});
</script>

<div class="page">
	<header class="header">
		<h1 class="title">{m.devices_title()}</h1>
		<p class="subtitle">{m.devices_subtitle()}</p>
	</header>

	{#if !standalone && permState !== 'unsupported'}
		<p class="ios-note">On iPhone, push only works after adding this app to the Home Screen.</p>
	{/if}

	<!-- ─── Status hero ─── -->
	<section
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

		{#if permState === 'default'}
			<button type="button" class="hero-cta" onclick={onEnable} disabled={busy}> Turn on </button>
		{:else if permState === 'granted'}
			<div class="hero-actions">
				<button
					type="button"
					class="hero-icon-btn"
					onclick={onTest}
					disabled={busy}
					title={m.devices_test()}
				>
					<Send size={16} strokeWidth={1.8} />
				</button>
				<button
					type="button"
					class="hero-icon-btn"
					onclick={onDisable}
					disabled={busy}
					title="Turn off"
				>
					<BellOff size={16} strokeWidth={1.8} />
				</button>
			</div>
		{/if}
	</section>

	<!-- ─── Devices list ─── -->
	<div class="section-label">
		<span class="sl-title"><b>{m.devices_list_title()}</b></span>
		{#if data.devices.length > 0}
			<span class="sl-right">{data.devices.length}</span>
		{/if}
	</div>

	<div class="set-card">
		{#if data.devices.length === 0}
			<div class="empty">
				<div class="empty-emoji">📵</div>
				<div class="empty-text">{m.devices_no_devices()}</div>
			</div>
		{:else}
			{#each data.devices as dev (dev.id)}
				<div class="set-row device-row" style="cursor: default">
					<div class="sr-icon">{deviceEmoji(dev.userAgent)}</div>
					<div class="sr-text">
						<div class="sr-label">{dev.label ?? defaultLabelFromUA(dev.userAgent)}</div>
						<div class="sr-desc">
							Added {formatRelative(dev.createdAt)}{#if dev.lastUsedAt}
								· last push {formatRelative(dev.lastUsedAt)}{/if}
						</div>
					</div>
					<div class="device-actions">
						<button
							type="button"
							class="icon-btn"
							onclick={() => startRename(dev.id, dev.label)}
							aria-label={m.devices_rename()}
						>
							<Pencil size={14} strokeWidth={1.8} />
						</button>
						<form method="POST" action="?/remove" use:enhance>
							<input type="hidden" name="id" value={dev.id} />
							<button
								type="submit"
								class="icon-btn icon-btn-danger"
								aria-label={m.devices_remove()}
							>
								<Trash2 size={14} strokeWidth={1.8} />
							</button>
						</form>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- ─── Rename sheet ─── -->
<BottomSheet
	bind:open={renameSheetOpen}
	title={m.devices_rename()}
	subtitle="Give this device a recognizable name."
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
			<span class="field-label">Label</span>
			<input
				type="text"
				name="label"
				bind:value={renameLabel}
				maxlength="64"
				placeholder="iPhone 15"
				use:focusOnMount
			/>
		</label>
		<div class="sheet-actions sheet-actions-row">
			<button type="button" class="sheet-cancel" onclick={() => (renameSheetOpen = false)}>
				{m.connect_cancel()}
			</button>
			<button type="submit" class="sheet-done">{m.saved()}</button>
		</div>
	</form>
</BottomSheet>

<style>
	.page {
		padding: 4px 0 16px;
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

	.ios-note {
		margin: -8px 4px 14px;
		padding: 0;
		font-size: 12px;
		color: var(--color-text-faint);
		line-height: 1.5;
	}

	/* ─── Hero ─── */
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
			color-mix(in oklab, var(--ok) 26%, transparent) 0%,
			transparent 70%
		);
	}
	.hero-warn .hero-wash {
		background: radial-gradient(
			circle at 70% 30%,
			color-mix(in oklab, var(--warn) 22%, transparent) 0%,
			transparent 70%
		);
	}
	.hero-err .hero-wash {
		background: radial-gradient(
			circle at 70% 30%,
			color-mix(in oklab, var(--err) 24%, transparent) 0%,
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
		background: color-mix(in oklab, var(--ok) 18%, var(--color-surface-1));
		color: var(--ok);
	}
	.hero-warn .hero-icon {
		background: color-mix(in oklab, var(--warn) 18%, var(--color-surface-1));
		color: var(--warn);
	}
	.hero-err .hero-icon {
		background: color-mix(in oklab, var(--err) 18%, var(--color-surface-1));
		color: var(--err);
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
		background: var(--color-accent);
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
		color: var(--color-text-muted);
		cursor: pointer;
		transition: background 120ms ease;
	}
	.hero-icon-btn:active:not(:disabled) {
		background: var(--color-bg-1);
	}
	.hero-icon-btn:disabled {
		opacity: 0.5;
		cursor: progress;
	}

	/* ─── Section labels ─── */
	.section-label {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 22px 4px 8px;
		gap: 12px;
	}
	.sl-title {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}
	.sl-title b {
		color: var(--color-text-subtle);
		font-weight: 600;
		letter-spacing: 0.04em;
	}
	.sl-right {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.06em;
		color: var(--color-text-faint);
	}

	/* ─── Empty ─── */
	.empty {
		padding: 32px 20px;
		text-align: center;
	}
	.empty-emoji {
		font-size: 28px;
		margin-bottom: 8px;
		opacity: 0.7;
	}
	.empty-text {
		font-size: 13px;
		color: var(--color-text-subtle);
	}

	/* ─── Device row ─── */
	.device-row {
		gap: 10px;
	}
	.device-actions {
		display: flex;
		gap: 6px;
		flex-shrink: 0;
	}
	.icon-btn {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-default);
		border-radius: 999px;
		color: var(--color-text-muted);
		cursor: pointer;
		transition: all 120ms ease;
	}
	.icon-btn:active {
		background: var(--color-bg-2);
	}
	.icon-btn-danger:hover {
		color: var(--err);
		border-color: var(--err);
	}

	/* ─── Sheet form ─── */
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
		border-radius: var(--radius-md, 12px);
		background: var(--color-surface-1);
	}
	.sheet-actions {
		padding: 14px 0 4px;
	}
	.sheet-actions-row {
		display: flex;
		gap: 8px;
	}
	.sheet-done {
		flex: 1;
		height: 48px;
		font: inherit;
		font-size: 15px;
		font-weight: 600;
		border-radius: var(--radius-md, 12px);
		border: none;
		background: var(--color-accent);
		color: #fff;
		cursor: pointer;
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
	}
</style>
