<svelte:head>
	<title>Offline — Admin</title>
</svelte:head>

<main class="offline-root">
	<div class="offline-card">
		<div class="offline-icon">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<path
					d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</div>
		<h1 class="offline-heading">No connection</h1>
		<p class="offline-sub">Can't reach the server. Check your connection and try again.</p>
		<button type="button" class="offline-retry" onclick={() => window.location.reload()}>
			Retry
		</button>
	</div>
</main>

<style>
	.offline-root {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px 16px;
		background: var(--color-bg-1);
	}

	.offline-card {
		text-align: center;
		max-width: 300px;
	}

	.offline-icon {
		width: 56px;
		height: 56px;
		margin: 0 auto 16px;
		color: var(--color-text-faint);
	}

	.offline-icon svg {
		width: 100%;
		height: 100%;
	}

	.offline-heading {
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 6px;
		color: var(--color-text-primary);
	}

	.offline-sub {
		font-size: 13px;
		color: var(--color-text-muted);
		line-height: 1.5;
		margin: 0 0 20px;
	}

	.offline-retry {
		font-size: 13px;
		font-weight: 600;
		padding: 8px 16px;
		border-radius: 999px;
		border: 1px solid var(--color-border-default);
		background: var(--color-surface-1);
		color: var(--color-text-primary);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.offline-retry:hover {
		background: var(--color-bg-2);
	}
</style>
