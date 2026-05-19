<script lang="ts">
	let {
		name,
		email,
		hubUrl,
		displayName,
		language,
		weekStarts = 'Monday',
		theme = 'Light',
		// Optional copy overrides
		sectionTitle = 'Profile',
		sectionSubtitle = 'global',
		sectionRight = 'read-only',
		scopeTitle = 'Identity & locale',
		ctaTitle = 'Manage in hub',
		ctaSubtitle = 'One place to change your name, language, and sessions.',
		ctaLabel = 'Open',
		badgeLabel = 'managed in hub'
	}: {
		name: string;
		email: string;
		hubUrl: string;
		displayName?: string | null;
		language?: string;
		weekStarts?: string;
		theme?: string;
		sectionTitle?: string;
		sectionSubtitle?: string;
		sectionRight?: string;
		scopeTitle?: string;
		ctaTitle?: string;
		ctaSubtitle?: string;
		ctaLabel?: string;
		badgeLabel?: string;
	} = $props();

	const initials = $derived(
		(displayName || name || 'U')
			.split(' ')
			.map((w: string) => w[0] ?? '')
			.join('')
			.slice(0, 2)
			.toUpperCase()
	);
</script>

<div class="phc-section-label">
	<span class="phc-sl-title"><b>{sectionTitle}</b> · {sectionSubtitle}</span>
	<span class="phc-sl-right">{sectionRight}</span>
</div>

<div class="set-card phc-card">
	<div class="phc-profile-row">
		<div class="phc-avatar">{initials}</div>
		<div class="phc-profile-info">
			<div class="phc-profile-name">{displayName || name || 'Set name'}</div>
			<div class="phc-profile-email">{email}</div>
		</div>
		<span class="phc-badge">{badgeLabel}</span>
	</div>

	<div class="set-scope phc-scope"><b>{scopeTitle}</b></div>

	<div class="set-row phc-row" data-readonly>
		<div class="sr-icon">@</div>
		<div class="sr-text"><div class="sr-label">Display name</div></div>
		<div class="sr-value">{displayName || '—'}</div>
	</div>
	{#if language}
		<div class="set-row phc-row" data-readonly>
			<div class="sr-icon">🌐</div>
			<div class="sr-text"><div class="sr-label">Language</div></div>
			<div class="sr-value">{language}</div>
		</div>
	{/if}
	<div class="set-row phc-row" data-readonly>
		<div class="sr-icon">📅</div>
		<div class="sr-text"><div class="sr-label">Week starts</div></div>
		<div class="sr-value">{weekStarts}</div>
	</div>
	<div class="set-row phc-row" data-readonly>
		<div class="sr-icon">☀</div>
		<div class="sr-text"><div class="sr-label">Theme</div></div>
		<div class="sr-value">{theme}</div>
	</div>

	<a class="phc-cta" href={hubUrl}>
		<div class="phc-cta-text">
			<b>{ctaTitle}</b>
			<span>{ctaSubtitle}</span>
		</div>
		<span class="phc-cta-arrow">
			{ctaLabel}
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

<style>
	/* Section label */
	.phc-section-label {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 22px 4px 8px;
		gap: 12px;
	}
	.phc-sl-title {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--color-text-faint);
		white-space: nowrap;
	}
	.phc-sl-title b {
		color: var(--color-text-subtle);
		font-weight: 600;
		letter-spacing: 0.04em;
	}
	.phc-sl-right {
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-text-faint);
		white-space: nowrap;
	}

	/* Read-only card variant */
	.phc-card {
		border-style: dashed !important;
		background: var(--color-bg-1) !important;
	}
	.phc-row {
		cursor: default;
	}
	.phc-row:active {
		background: transparent;
	}
	.phc-row :global(.sr-icon) {
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-subtle);
	}
	.phc-row :global(.sr-label) {
		color: var(--color-text-muted);
	}
	.phc-row :global(.sr-value) {
		color: var(--color-text-subtle);
	}

	/* Profile row */
	.phc-profile-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		position: relative;
		background: var(--color-surface-1);
		border-bottom: 1px dashed var(--color-border-default);
	}
	.phc-avatar {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 14px;
		font-weight: 600;
		color: #fff;
		flex-shrink: 0;
		background: linear-gradient(
			135deg,
			var(--color-accent),
			color-mix(in oklab, var(--color-accent) 50%, #000)
		);
	}
	.phc-profile-info {
		min-width: 0;
		flex: 1;
	}
	.phc-profile-name {
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.015em;
	}
	.phc-profile-email {
		font-size: 12px;
		color: var(--color-text-subtle);
		margin-top: 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.phc-badge {
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

	.phc-scope {
		background: transparent;
	}

	/* CTA */
	.phc-cta {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		border-top: 1px dashed var(--color-border-default);
		background: var(--color-surface-1);
		text-decoration: none;
		color: inherit;
		transition: background 150ms ease;
	}
	.phc-cta:active {
		background: var(--color-surface-2, var(--color-bg-1));
	}
	.phc-cta-text {
		flex: 1;
		min-width: 0;
	}
	.phc-cta-text b {
		display: block;
		font-size: 13.5px;
		font-weight: 600;
		color: color-mix(in oklab, var(--color-accent) 80%, #000);
	}
	.phc-cta-text span {
		display: block;
		font-size: 11.5px;
		color: var(--color-text-subtle);
		margin-top: 2px;
		line-height: 1.4;
	}
	.phc-cta-arrow {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-accent);
		flex-shrink: 0;
	}
	.phc-cta-arrow svg {
		width: 14px;
		height: 14px;
		stroke-width: 2;
	}
</style>
