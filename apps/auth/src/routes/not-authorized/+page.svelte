<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{m.not_authorized_title()}</title>
</svelte:head>

<main class="login-root">
	<div class="login-card">
		<div class="brand">
			<span class="brand-mark"></span>
			<span class="brand-name">Nexo</span>
		</div>

		<h1 class="heading">{m.not_authorized_heading()}</h1>
		<p class="sub">{m.not_authorized_sub()}</p>

		<a href="/login" class="back-link">
			<svg
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				class="back-icon"
			>
				<path d="M10 3L5 8l5 5" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			{m.not_authorized_back()}
		</a>
	</div>
</main>

<style>
	.login-root {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px 16px;
		background: var(--color-bg-0);
	}

	.login-card {
		width: 100%;
		max-width: 360px;
		background: var(--color-surface-1);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-xl);
		padding: 36px 32px 28px;
		box-shadow: 0 8px 40px -12px rgb(0 0 0 / 0.08);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 28px;
	}

	.brand-mark {
		display: block;
		width: 22px;
		height: 22px;
		border-radius: 6px;
		background: linear-gradient(
			135deg,
			var(--color-accent),
			color-mix(in oklab, var(--color-accent) 50%, #000)
		);
		box-shadow: 0 2px 8px color-mix(in oklab, var(--color-accent) 25%, transparent);
		position: relative;
	}
	.brand-mark::after {
		content: '';
		position: absolute;
		inset: 4px;
		border-radius: 3px;
		background: linear-gradient(135deg, rgb(255 255 255 / 0.24), transparent 60%);
	}

	.brand-name {
		font-size: 15px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--color-text-primary);
	}

	.heading {
		font-size: 20px;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: var(--color-text-primary);
		margin: 0 0 6px;
	}

	.sub {
		font-size: 13px;
		color: var(--color-text-muted);
		margin: 0 0 24px;
		line-height: 1.5;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-subtle);
		text-decoration: none;
		transition: color var(--duration-fast) var(--ease-out);
	}
	.back-link:hover {
		color: var(--color-text-primary);
	}

	.back-icon {
		width: 14px;
		height: 14px;
	}
</style>
