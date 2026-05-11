<!--
  +page.svelte — Nexo landing page
  Stack: SvelteKit + Tailwind CSS v4. Tokens from app.css (@theme). Light theme.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	type App = {
		id: 'finance' | 'gym' | 'time' | 'pomodoro';
		name: string;
		icon: string;
		status: 'live' | 'soon' | 'planned';
		desc: string;
		href: string;
		meta: string;
	};

	const apps: App[] = $derived([
		{
			id: 'finance',
			name: 'Finance',
			icon: '/icon-finance.svg',
			status: 'live',
			desc: 'Track accounts, categorize spend, and see where the month went. No banks involved.',
			href: env.PUBLIC_FINANCE_URL ?? '#',
			meta: `v${data.versions.finance}`
		},
		{
			id: 'gym',
			name: 'Gym',
			icon: '/icon-gym.svg',
			status: 'soon',
			desc: 'Log lifts, supersets, and PRs. Plate math without doing plate math.',
			href: '#',
			meta: 'Summer 2026'
		},
		{
			id: 'time',
			name: 'Time',
			icon: '/favicon.svg',
			status: 'planned',
			desc: 'What did the week actually go to? Per-project timers with a weekly receipt.',
			href: '#',
			meta: 'Someday'
		},
		{
			id: 'pomodoro',
			name: 'Pomodoro',
			icon: '/favicon.svg',
			status: 'planned',
			desc: "25 on, 5 off. Opinionated, doesn't argue with you.",
			href: '#',
			meta: 'Someday'
		}
	]);

	const steps = [
		{
			title: 'Open in Safari',
			body: "Go to krieger2501.de on your iPhone. Has to be Safari — Chrome can't install PWAs."
		},
		{
			title: 'Tap Share',
			body: 'The little square with the arrow at the bottom. You know the one.'
		},
		{ title: 'Add to Home Screen', body: 'Scroll down in the sheet, tap it, then tap Add.' },
		{
			title: 'Done',
			body: 'It opens standalone, no browser chrome. Looks and feels like a real app.'
		}
	];

	const wip = ['building gym tracker', 'tweaking the forecast view', 'making it feel faster'];
	let wipIndex = $state(0);
	let activeStep = $state(0);

	onMount(() => {
		const stepTick = setInterval(() => {
			activeStep = (activeStep + 1) % steps.length;
		}, 3500);
		const wipTick = setInterval(() => {
			wipIndex = (wipIndex + 1) % wip.length;
		}, 2800);

		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) {
						e.target.classList.add('in');
						io.unobserve(e.target);
					}
				}
			},
			{ threshold: 0.12 }
		);
		document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

		return () => {
			clearInterval(stepTick);
			clearInterval(wipTick);
			io.disconnect();
		};
	});

	function handleCardMouseMove(e: MouseEvent) {
		const el = e.currentTarget as HTMLElement;
		const r = el.getBoundingClientRect();
		el.style.setProperty('--mx', `${e.clientX - r.left}px`);
		el.style.setProperty('--my', `${e.clientY - r.top}px`);
	}
</script>

<svelte:head>
	<title>Nexo — my little corner of the internet</title>
	<meta name="description" content="A small collection of self-hosted apps, built for me." />
</svelte:head>

<!-- ─── NAV ─── -->
<nav class="border-border-subtle bg-bg-0/80 sticky top-0 z-40 border-b backdrop-blur-md">
	<div class="mx-auto flex h-14 max-w-[1100px] items-center justify-between px-6">
		<div class="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
			<img src="/favicon.svg" alt="Nexo" class="brand-mark" />
			Nexo
		</div>
		<div class="text-text-muted flex gap-5 text-sm">
			<a class="hover:text-text-primary transition-colors" href="#apps">Apps</a>
			<a class="hover:text-text-primary transition-colors" href="#install">Install</a>
			<a class="hover:text-text-primary transition-colors" href="#about">About</a>
		</div>
	</div>
</nav>

<!-- ─── HERO ─── -->
<header class="relative overflow-hidden py-20 md:py-28">
	<div class="hero-bg pointer-events-none absolute inset-0 z-0"></div>
	<div class="relative z-10 mx-auto max-w-[1100px] px-6 text-center">
		<h1 class="hero-title">Nexo</h1>
		<p
			class="text-text-muted mx-auto mt-5 max-w-[480px] text-[clamp(16px,1.5vw,18px)] leading-relaxed"
		>
			Apps I built for myself. Nothing fancy, nothing tracked. Always one tap away from your home
			screen.
		</p>
		<div class="text-text-faint mt-6 inline-flex items-center gap-2 font-mono text-[11px]">
			<span class="wip-dot"></span>
			currently {wip[wipIndex]}
		</div>
	</div>
</header>

<!-- ─── APPS ─── -->
<section id="apps" class="scroll-mt-20 py-14">
	<div class="mx-auto max-w-[1100px] px-6">
		<div class="reveal mb-7">
			<h2 class="text-2xl font-semibold tracking-tight">The apps</h2>
			<p class="text-text-muted mt-1.5 text-[15px]">Tap to open, or wait for the rest to land.</p>
		</div>

		<div class="reveal grid grid-cols-1 gap-4 sm:grid-cols-2" style="transition-delay: 60ms">
			{#each apps as app}
				<a
					href={app.href}
					data-app={app.id}
					class="card"
					class:locked={app.status !== 'live'}
					onmousemove={handleCardMouseMove}
					onclick={(e) => {
						if (app.status !== 'live') e.preventDefault();
					}}
				>
					<div class="flex items-center justify-between">
						<div class="icon-tile"><img src={app.icon} alt={app.name} class="icon-tile-img" /></div>
						{#if app.status === 'live'}
							<span class="status-pill status-pill--live"><span class="dot"></span>Live</span>
						{:else if app.status === 'soon'}
							<span class="status-pill">In progress</span>
						{:else}
							<span class="status-pill">Someday</span>
						{/if}
					</div>
					<h3 class="mt-5 text-xl font-semibold tracking-[-0.015em]">{app.name}</h3>
					<p class="text-text-muted mt-1.5 flex-1 text-[14px] leading-relaxed">{app.desc}</p>
					<div class="mt-5 flex items-center justify-between">
						<span class="text-text-faint font-mono text-[10px] tracking-widest uppercase"
							>{app.meta}</span
						>
						{#if app.status === 'live'}
							<span class="card-link">
								Open
								<svg
									viewBox="0 0 16 16"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									class="size-3.5"
								>
									<path d="M3 8h10M9 4l4 4-4 4" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							</span>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	</div>
</section>

<!-- ─── INSTALL ─── -->
<section id="install" class="scroll-mt-20 py-14">
	<div class="mx-auto max-w-[1100px] px-6">
		<div class="reveal mb-7">
			<h2 class="text-2xl font-semibold tracking-tight">Add to your iPhone</h2>
			<p class="text-text-muted mt-1.5 max-w-[440px] text-[15px]">
				It installs like a real app — standalone window, home screen icon, no browser chrome.
			</p>
		</div>

		<div
			class="reveal grid grid-cols-1 items-center gap-10 md:grid-cols-[1.2fr_1fr]"
			style="transition-delay: 60ms"
		>
			<div class="flex flex-col gap-0.5">
				{#each steps as s, i}
					<button
						type="button"
						class="step"
						class:active={i === activeStep}
						onclick={() => (activeStep = i)}
					>
						<div class="step-num">{i + 1}</div>
						<div class="text-left">
							<div class="text-[14px] font-medium">{s.title}</div>
							<p class="text-text-muted mt-0.5 text-[13px] leading-relaxed">{s.body}</p>
						</div>
					</button>
				{/each}
			</div>

			<div class="flex justify-center">
				<div class="phone">
					<div class="phone-screen">
						<div class="phone-status"><span>9:41</span><span>5G</span></div>
						<div class="phone-body">
							{#if activeStep < 3}
								<p class="text-center text-[11px]" style="color:#71717a">
									Step {activeStep + 1}: {steps[activeStep].title}
								</p>
							{:else}
								<div class="home-icon-new"><img src="/icon-finance.svg" alt="Finance" /></div>
								<p class="mt-2 text-center text-[11px] font-medium" style="color:#f4f4f5">
									Finance
								</p>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- ─── ABOUT ─── -->
<section id="about" class="scroll-mt-20 py-14">
	<div class="mx-auto max-w-[1100px] px-6">
		<div class="reveal mb-7">
			<h2 class="text-2xl font-semibold tracking-tight">A weekend that got out of hand</h2>
			<p class="text-text-muted mt-1.5 max-w-[480px] text-[15px]">
				I wanted a finance app that didn't sell my data. So I made one. Then I wanted a gym tracker.
				You see where this is going.
			</p>
		</div>
		<div class="reveal grid grid-cols-1 gap-4 sm:grid-cols-2" style="transition-delay: 60ms">
			<div class="card-static">
				<div class="text-text-faint mb-2 font-mono text-[11px] tracking-widest uppercase">
					How it's built
				</div>
				<h3 class="text-base font-semibold">SvelteKit + Tailwind on a €5/mo VPS</h3>
				<p class="text-text-muted mt-1.5 text-[14px] leading-relaxed">
					One repo, one set of design tokens. Each app is its own route with its own home screen
					icon.
				</p>
			</div>
			<div class="card-static">
				<div class="text-text-faint mb-2 font-mono text-[11px] tracking-widest uppercase">
					House rules
				</div>
				<h3 class="text-base font-semibold">No accounts, no ads, no rush</h3>
				<p class="text-text-muted mt-1.5 text-[14px] leading-relaxed">
					Ships when it's ready. Gets edited when something bugs me. Stays small on purpose.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- ─── FOOTER ─── -->
<footer class="border-border-subtle text-text-faint border-t py-7 text-[12px]">
	<div class="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-6">
		<div>© 2026 Nexo · krieger2501.de</div>
		<div class="font-mono tracking-wider uppercase">made for one</div>
	</div>
</footer>

<style>
	.brand-mark {
		width: 22px;
		height: 22px;
		display: block;
	}

	.hero-bg {
		background:
			radial-gradient(
				ellipse 70% 50% at 50% 0%,
				color-mix(in oklab, var(--color-accent) 11%, transparent),
				transparent 65%
			),
			linear-gradient(to right, rgb(10 10 10 / 0.04) 1px, transparent 1px) 0 0 / 56px 56px,
			linear-gradient(to bottom, rgb(10 10 10 / 0.04) 1px, transparent 1px) 0 0 / 56px 56px,
			var(--color-bg-0);
		mask-image: radial-gradient(ellipse 80% 70% at 50% 20%, #000 0%, #000 40%, transparent 100%);
	}

	.hero-title {
		font-size: clamp(64px, 9vw, 112px);
		line-height: 0.94;
		letter-spacing: -0.04em;
		font-weight: 600;
		margin: 0 0 8px;
		background: linear-gradient(
			175deg,
			#18181b 0%,
			color-mix(in oklab, #18181b 55%, var(--color-bg-0)) 100%
		);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	/* Tiny pulsing dot for the "currently building" line */
	.wip-dot {
		display: inline-block;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--color-accent);
		animation: pulse 2.4s var(--ease-in-out) infinite;
		flex-shrink: 0;
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

	/* — Card — */
	.card,
	.card-static {
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
	}
	.card {
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
			500px circle at var(--mx, 50%) var(--my, 0%),
			color-mix(in oklab, var(--color-accent) 8%, transparent),
			transparent 50%
		);
		opacity: 0;
		transition: opacity var(--duration-slow) var(--ease-out);
	}
	.card:hover::before {
		opacity: 1;
	}
	.card:hover {
		transform: translateY(-2px);
		border-color: color-mix(in oklab, var(--color-accent) 35%, var(--color-border-default));
		box-shadow: 0 8px 32px -8px color-mix(in oklab, var(--color-accent) 12%, transparent);
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
	}
	.icon-tile-img {
		width: 100%;
		height: 100%;
		display: block;
	}
	.card.locked .icon-tile {
		opacity: 0.5;
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
	}

	.card-link {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		color: color-mix(in oklab, var(--color-accent) 80%, #000);
		font-size: 13px;
		font-weight: 500;
		transition: gap var(--duration-base) var(--ease-out);
	}
	.card:hover .card-link {
		gap: 9px;
	}

	/* — Install steps — */
	.step {
		display: flex;
		gap: 14px;
		align-items: flex-start;
		width: 100%;
		padding: 14px;
		border-radius: var(--radius-md);
		border: 0;
		border-left: 2px solid var(--color-border-default);
		background: transparent;
		text-align: left;
		color: inherit;
		cursor: pointer;
		transition:
			background var(--duration-base) var(--ease-out),
			border-color var(--duration-base) var(--ease-out);
	}
	.step.active {
		background: var(--color-surface-1);
		border-left-color: var(--color-accent);
	}
	.step-num {
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-family: var(--font-mono);
		font-size: 11px;
		background: var(--color-bg-2);
		color: var(--color-text-subtle);
		border: 1px solid var(--color-border-default);
		transition:
			background var(--duration-base) var(--ease-out),
			color var(--duration-base) var(--ease-out);
	}
	.step.active .step-num {
		background: var(--color-accent);
		color: #fff;
		border-color: var(--color-accent);
	}

	/* — Phone mock — */
	.phone {
		width: 260px;
		aspect-ratio: 9 / 19.5;
		border-radius: 40px;
		background: linear-gradient(180deg, #2a2a2d 0%, #0e0e10 100%);
		border: 1px solid #1a1a1d;
		box-shadow:
			0 0 0 7px #18181b,
			0 24px 64px -16px rgb(0 0 0 / 0.4),
			0 0 48px -8px color-mix(in oklab, var(--color-accent) 30%, transparent);
		padding: 9px;
	}
	.phone-screen {
		width: 100%;
		height: 100%;
		background: #0a0a0a;
		color: #f4f4f5;
		border-radius: 32px;
		overflow: hidden;
	}
	.phone-status {
		display: flex;
		justify-content: space-between;
		padding: 14px 24px 0;
		font-size: 12px;
		font-weight: 600;
	}
	.phone-body {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: calc(100% - 36px);
	}
	.home-icon-new {
		width: 60px;
		height: 60px;
		border-radius: 13px;
		overflow: hidden;
		box-shadow: 0 0 16px color-mix(in oklab, var(--color-accent) 35%, transparent);
	}
	.home-icon-new img {
		width: 100%;
		height: 100%;
		display: block;
	}
</style>
