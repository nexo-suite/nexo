<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	type App = {
		id: string;
		name: string;
		monogram: string;
		icon?: string;
		accent: string;
		status: 'live' | 'soon' | 'planned';
		desc: string;
		meta: string;
	};

	let { apps, firstName, authUrl }: { apps: App[]; firstName: string | null; authUrl: string } =
		$props();

	function handleCardMouseMove(e: MouseEvent) {
		const el = e.currentTarget as HTMLElement;
		const r = el.getBoundingClientRect();
		el.style.setProperty('--mx', `${e.clientX - r.left}px`);
		el.style.setProperty('--my', `${e.clientY - r.top}px`);
	}
</script>

<section id="apps" class="scroll-mt-20 py-14">
	<div class="mx-auto max-w-[1100px] px-6">
		<div class="reveal section-head mb-7">
			<div class="t-label">{m.section_apps()}</div>
			<h2 class="mt-1 text-[clamp(28px,3vw,36px)] font-semibold tracking-tight">
				{m.apps_heading()}
			</h2>
			<p class="text-text-muted mt-2 max-w-[520px] text-[15px] leading-relaxed">{m.apps_sub()}</p>
		</div>

		<div class="reveal grid grid-cols-1 gap-4 sm:grid-cols-2" style="transition-delay: 60ms">
			{#each apps as app (app.id)}
				<div
					data-app={app.id}
					class="card"
					class:locked={app.status !== 'live'}
					onmousemove={handleCardMouseMove}
					role="presentation"
					style="--card-accent: {app.accent}"
				>
					<div class="flex items-center justify-between">
						{#if app.icon}
							<img class="icon-tile icon-tile-img" src={app.icon} alt="" width="46" height="46" />
						{:else}
							<div class="icon-tile" style="color: {app.accent}">{app.monogram}</div>
						{/if}
						{#if app.status === 'live'}
							<span class="status-pill status-pill--live">
								<span class="dot"></span>{m.status_live()}
							</span>
						{:else if app.status === 'soon'}
							<span class="status-pill">{m.status_soon()}</span>
						{:else}
							<span class="status-pill status-pill--idea">{m.status_idea()}</span>
						{/if}
					</div>
					<h3 class="mt-5 text-xl font-semibold tracking-[-0.015em]">{app.name}</h3>
					<p class="text-text-muted mt-1.5 flex-1 text-[14px] leading-relaxed">{app.desc}</p>
					<div class="mt-5 flex items-center justify-between">
						<span class="text-text-faint font-mono text-[10px] tracking-widest uppercase"
							>{app.meta}</span
						>
					</div>
				</div>
			{/each}
		</div>

		<div class="reveal mt-8 flex flex-col items-center gap-2.5" style="transition-delay: 120ms">
			<a href={firstName ? '/apps' : `${authUrl}/login`} class="cta-btn">
				{firstName ? `Go to your apps` : 'Sign in'}
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					stroke-width="1.7"
					class="cta-arrow"
				>
					<path d="M3 8h10M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			</a>
			<p class="text-text-faint font-mono text-[11px] tracking-wider">
				{firstName ? m.cta_invite_hint() : 'invite-only · ask Kevin'}
			</p>
		</div>
	</div>
</section>

<style>
	.t-label {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}

	.card {
		position: relative;
		display: flex;
		flex-direction: column;
		padding: 28px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		overflow: hidden;
		text-decoration: none;
		color: inherit;
		min-height: 240px;
		transition:
			transform var(--duration-base) var(--ease-out),
			border-color var(--duration-base) var(--ease-out),
			box-shadow var(--duration-base) var(--ease-out);
	}
	.card::before {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		background: radial-gradient(
			600px circle at var(--mx, 50%) var(--my, 0%),
			color-mix(in oklab, var(--card-accent, var(--color-accent)) 12%, transparent),
			transparent 45%
		);
		opacity: 0;
		transition: opacity var(--duration-slow) var(--ease-out);
	}
	.card:hover::before {
		opacity: 1;
	}
	.card:hover {
		transform: translateY(-4px);
		border-color: color-mix(
			in oklab,
			var(--card-accent, var(--color-accent)) 50%,
			var(--color-border-default)
		);
		box-shadow:
			0 12px 40px -8px color-mix(in oklab, var(--card-accent, var(--color-accent)) 18%, transparent),
			0 0 0 1px color-mix(in oklab, var(--card-accent, var(--color-accent)) 15%, transparent);
	}
	.card.locked {
		opacity: 0.55;
		cursor: default;
	}
	.card.locked:hover {
		transform: none;
		opacity: 0.65;
		box-shadow: none;
		border-color: var(--color-border-default);
	}

	.icon-tile {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-md);
		display: grid;
		place-items: center;
		overflow: hidden;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		font-family: var(--font-mono);
		font-size: 20px;
		font-weight: 500;
	}
	.card.locked .icon-tile {
		opacity: 0.5;
	}
	.icon-tile-img {
		background: transparent;
		border: 0;
		padding: 0;
		object-fit: contain;
	}

	.status-pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 3px 8px;
		border-radius: 999px;
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-1);
		font-family: var(--font-mono);
		font-size: 10px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}
	.status-pill--live {
		color: color-mix(in oklab, var(--color-accent) 80%, #000);
		border-color: color-mix(in oklab, var(--color-accent) 25%, transparent);
		background: color-mix(in oklab, var(--color-accent) 8%, transparent);
	}
	.status-pill--live .dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: currentColor;
		box-shadow: 0 0 6px currentColor;
		animation: pulse 2.4s var(--ease-in-out) infinite;
	}
	.status-pill--idea {
		border-style: dashed;
		color: var(--color-text-faint);
		background: transparent;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.4;
			transform: scale(0.75);
		}
	}

	.cta-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 12px 24px;
		border-radius: 999px;
		background: var(--color-accent);
		color: #fff;
		font-size: 14px;
		font-weight: 600;
		text-decoration: none;
		transition:
			transform var(--duration-base) var(--ease-out),
			box-shadow var(--duration-base) var(--ease-out);
		box-shadow: 0 4px 16px -4px color-mix(in oklab, var(--color-accent) 40%, transparent);
	}
	.cta-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 24px -6px color-mix(in oklab, var(--color-accent) 50%, transparent);
	}
	.cta-btn:active {
		transform: translateY(0);
	}
	.cta-arrow {
		width: 14px;
		height: 14px;
		transition: transform var(--duration-base) var(--ease-out);
	}
	.cta-btn:hover .cta-arrow {
		transform: translateX(3px);
	}
</style>
