<script lang="ts">
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

	type FinanceGlance = {
		liquid: number;
		monthExpenses: number;
		monthIncome: number;
		tightDay: string | null;
		tightAmount: number;
	};

	let {
		liveApps,
		workshopApps,
		ideaApps,
		financeGlance
	}: {
		liveApps: LiveApp[];
		workshopApps: WorkshopApp[];
		ideaApps: IdeaApp[];
		financeGlance: FinanceGlance | null;
	} = $props();

	const fmt = (n: number) =>
		n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
</script>

<!-- Your Apps -->
{#if liveApps.length > 0}
	<div class="sec">
		<span class="sec-title"><b>Your apps</b> · {liveApps.length}</span>
		<span class="sec-right">live</span>
	</div>

	<div class="app-stack">
		{#each liveApps as app (app.id)}
			<a class="app-card" href={app.href} style="--app-accent: {app.accent}" data-app={app.id}>
				<div class="ac-head">
					<div class="app-tile">{app.monogram}</div>
					<span class="pill pill-live"><span class="pill-dot"></span>Live</span>
				</div>
				<div class="ac-name">{app.name}</div>
				<div class="ac-desc">{app.desc}</div>

				{#if app.id === 'finance' && financeGlance}
					{@const g = financeGlance}
					{@const net = g.monthIncome - g.monthExpenses}
					<div class="ac-glance">
						<div class="stat">
							<div class="stat-k">Liquid · today</div>
							<div class="stat-v mono">{fmt(g.liquid)}</div>
						</div>
						<div class="stat">
							<div class="stat-k">This month</div>
							<div class="stat-v mono {net >= 0 ? 'up' : 'down'}">
								{net >= 0 ? '+' : ''}{fmt(net)}
								{net >= 0 ? '↑' : '↓'}
							</div>
						</div>
						<div class="stat">
							<div class="stat-k">Tight day</div>
							<div class="stat-v mono">{g.tightDay ?? '—'}</div>
						</div>
					</div>
				{/if}

				<div class="ac-foot">
					<span class="ac-meta">{app.meta}</span>
					<span class="btn-open">
						Open
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-linecap="round"
							stroke-linejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg
						>
					</span>
				</div>
			</a>
		{/each}
	</div>
{:else}
	<div class="sec">
		<span class="sec-title"><b>Your apps</b></span>
	</div>
	<div class="empty">
		<p>No apps unlocked yet. Ask Kevin to hook you up.</p>
	</div>
{/if}

<!-- Workshop -->
<div class="sec">
	<span class="sec-title"><b>In the workshop</b> · {workshopApps.length}</span>
	<span class="sec-right">soon-ish</span>
</div>

<div class="app-stack">
	{#each workshopApps as app (app.id)}
		<div class="app-card locked" style="--app-accent: {app.accent}">
			<div class="ac-head">
				<div class="app-tile">{app.monogram}</div>
				<span class="pill pill-soon">Coming soon</span>
			</div>
			<div class="ac-name">{app.name}</div>
			<div class="ac-desc">{app.desc}</div>
			<div class="ac-foot">
				<span class="ac-meta">{app.meta}</span>
				<span class="btn-locked">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.8"
						><rect x="5" y="11" width="14" height="10" rx="2" /><path
							d="M8 11V7a4 4 0 0 1 8 0v4"
						/></svg
					>
					locked
				</span>
			</div>
		</div>
	{/each}
</div>

<!-- Idea strip -->
<div class="sec">
	<span class="sec-title"><b>Maybe later</b></span>
	<span class="sec-right">ideas</span>
</div>
<div class="idea-strip">
	{#each ideaApps as app (app.id)}
		<div class="idea-chip">
			<span class="idea-icon" style="color: {app.accent}">{app.monogram}</span>
			<span class="idea-text">
				{app.name}
				<span class="idea-sub">{app.sub}</span>
			</span>
		</div>
	{/each}
</div>

<style>
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

	.app-stack {
		display: grid;
		gap: 10px;
	}
	.app-card {
		--app-soft: color-mix(in oklab, var(--app-accent) 10%, var(--color-surface-1));
		--app-line: color-mix(in oklab, var(--app-accent) 28%, var(--color-border-default));
		--app-ink: color-mix(in oklab, var(--app-accent) 80%, #000);
		position: relative;
		padding: 22px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		display: flex;
		flex-direction: column;
		text-decoration: none;
		color: inherit;
		overflow: hidden;
		transition:
			transform var(--duration-base) var(--ease-out),
			border-color var(--duration-base) var(--ease-out);
	}
	.app-card::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(
			60% 70% at 100% 0%,
			color-mix(in oklab, var(--app-accent) 10%, transparent),
			transparent 70%
		);
		pointer-events: none;
	}
	.app-card:active:not(.locked) {
		transform: scale(0.99);
		border-color: var(--app-line);
	}
	.app-card > * {
		position: relative;
		z-index: 1;
	}
	.app-card.locked {
		opacity: 0.78;
	}

	.ac-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 14px;
	}
	.app-tile {
		width: 46px;
		height: 46px;
		border-radius: var(--radius-md);
		display: grid;
		place-items: center;
		background: color-mix(in oklab, var(--app-accent) 12%, var(--color-surface-1));
		border: 1px solid color-mix(in oklab, var(--app-accent) 30%, var(--color-border-default));
		color: var(--app-ink);
		font-family: var(--font-mono);
		font-weight: 500;
		font-size: 21px;
		letter-spacing: -0.02em;
	}
	.app-card.locked .app-tile {
		color: var(--color-text-faint);
		border-color: var(--color-border-default);
		background: var(--color-bg-1);
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 4px 9px;
		border-radius: 999px;
		border: 1px solid var(--color-border-default);
		color: var(--color-text-muted);
		background: var(--color-bg-2);
	}
	.pill-live {
		color: var(--app-ink);
		border-color: color-mix(in oklab, var(--app-accent) 30%, transparent);
		background: color-mix(in oklab, var(--app-accent) 10%, transparent);
	}
	.pill-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
		box-shadow: 0 0 6px currentColor;
		animation: pulse 2.4s cubic-bezier(0.65, 0, 0.35, 1) infinite;
	}
	.pill-soon {
		color: var(--color-text-faint);
		background: var(--color-bg-1);
		border-color: var(--color-border-subtle);
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.5;
			transform: scale(0.85);
		}
	}

	.ac-name {
		font-size: 22px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
	.app-card.locked .ac-name {
		color: var(--color-text-muted);
	}
	.ac-desc {
		color: var(--color-text-muted);
		margin: 4px 0 0;
		font-size: 13.5px;
		line-height: 1.5;
	}

	.ac-glance {
		display: flex;
		gap: 18px;
		justify-content: space-between;
		align-items: baseline;
		flex-wrap: wrap;
		row-gap: 8px;
		margin-top: 14px;
		padding-top: 12px;
		border-top: 1px dashed var(--color-border-subtle);
	}
	.stat {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.stat-k {
		font-family: var(--font-mono);
		font-size: 9.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}
	.stat-v {
		margin-top: 3px;
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.015em;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
	}
	.stat-v.up {
		color: var(--app-ink);
	}
	.stat-v.down {
		color: oklch(0.59 0.2 27);
	}
	.stat-v.mono {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
	}

	.ac-foot {
		margin-top: 16px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.ac-meta {
		font-family: var(--font-mono);
		font-size: 10.5px;
		color: var(--color-text-faint);
		letter-spacing: 0.04em;
	}
	.btn-open {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 38px;
		padding: 0 14px 0 16px;
		border-radius: 999px;
		background: var(--app-accent);
		color: #fff;
		font-size: 13.5px;
		font-weight: 600;
		letter-spacing: -0.005em;
		text-decoration: none;
	}
	.btn-open svg {
		width: 13px;
		height: 13px;
		stroke-width: 2.4;
	}
	.btn-locked {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 38px;
		padding: 0 14px;
		border-radius: 999px;
		background: var(--color-bg-1);
		color: var(--color-text-subtle);
		font-size: 13.5px;
		font-weight: 500;
		border: 1px solid var(--color-border-subtle);
		cursor: not-allowed;
	}
	.btn-locked svg {
		width: 12px;
		height: 12px;
	}

	.idea-strip {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		margin: 0 -16px;
		padding: 4px 16px 8px;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
	}
	.idea-strip::-webkit-scrollbar {
		display: none;
	}
	.idea-chip {
		flex-shrink: 0;
		scroll-snap-align: start;
		padding: 10px 12px 12px;
		background: var(--color-surface-1);
		border: 1px dashed var(--color-border-default);
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 160px;
	}
	.idea-icon {
		width: 28px;
		height: 28px;
		border-radius: 7px;
		background: var(--color-bg-1);
		border: 1px solid var(--color-border-subtle);
		display: grid;
		place-items: center;
		font-family: var(--font-mono);
		font-size: 13px;
		flex-shrink: 0;
	}
	.idea-text {
		font-size: 13.5px;
		font-weight: 500;
		letter-spacing: -0.005em;
		color: var(--color-text-muted);
	}
	.idea-sub {
		display: block;
		font-size: 10.5px;
		color: var(--color-text-faint);
		margin-top: 2px;
		font-family: var(--font-mono);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.empty {
		padding: 32px 16px;
		text-align: center;
		background: var(--color-surface-1);
		border: 1px dashed var(--color-border-default);
		border-radius: var(--radius-xl);
		color: var(--color-text-muted);
		font-size: 13.5px;
	}
</style>
