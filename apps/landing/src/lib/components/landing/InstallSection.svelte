<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	type Step = { title: string; body: string };
	let { steps, activeStep = $bindable(0) }: { steps: Step[]; activeStep: number } = $props();
</script>

<section id="install" class="bg-bg-1 scroll-mt-20 py-14">
	<div class="mx-auto max-w-[1100px] px-6">
		<div class="reveal section-head mb-7">
			<div class="t-label">{m.section_install()}</div>
			<h2 class="mt-1 text-[clamp(28px,3vw,36px)] font-semibold tracking-tight">
				{m.install_heading()}
			</h2>
			<p class="text-text-muted mt-2 max-w-[440px] text-[15px] leading-relaxed">
				{m.install_sub()}
			</p>
		</div>

		<div
			class="reveal grid grid-cols-1 items-center gap-10 md:grid-cols-[1.2fr_1fr]"
			style="transition-delay: 60ms"
		>
			<div class="flex flex-col gap-0.5">
				{#each steps as s, i (s.title)}
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

<style>
	.t-label {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--color-text-faint);
	}

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
