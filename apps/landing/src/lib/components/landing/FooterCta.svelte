<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	let { firstName, authUrl }: { firstName: string | null; authUrl: string } = $props();
</script>

<footer class="border-border-subtle text-text-faint border-t py-5 pb-20 text-[12px] sm:pb-5">
	<div class="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-6">
		<div>{m.footer_copy()}</div>
		<div class="flex items-center gap-4">
			<a href="/impressum" class="text-text-faint hover:text-text-subtle transition-colors">{m.nav_impressum()}</a>
			<a href="/privacy" class="text-text-faint hover:text-text-subtle transition-colors">{m.nav_privacy()}</a>
			<span class="font-mono tracking-wider italic">{m.footer_tagline()}</span>
		</div>
	</div>
</footer>

<div class="sticky-cta">
	<div class="sticky-cta-text">
		{#if firstName}
			<span class="text-text-subtle text-[12px]">{m.sticky_hint()}</span>
			<span class="text-[14px] font-medium">{firstName}'s apps →</span>
		{:else}
			<span class="text-text-subtle text-[12px]">Got an invite?</span>
			<span class="text-[14px] font-medium">Sign in →</span>
		{/if}
	</div>
	<a href={firstName ? '/apps' : `${authUrl}/login`} class="sticky-cta-btn">
		{firstName ? 'Open' : 'Sign in'}
	</a>
</div>

<style>
	.sticky-cta {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 30;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
		background: color-mix(in oklab, var(--color-surface-1) 92%, transparent);
		backdrop-filter: blur(12px);
		border-top: 1px solid var(--color-border-subtle);
		max-width: 480px;
		margin: 0 auto;
	}
	@media (min-width: 640px) {
		.sticky-cta {
			display: none;
		}
	}
	.sticky-cta-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.sticky-cta-btn {
		display: inline-flex;
		align-items: center;
		padding: 10px 16px;
		border-radius: 999px;
		background: var(--color-accent);
		color: #fff;
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
		flex-shrink: 0;
	}
</style>
