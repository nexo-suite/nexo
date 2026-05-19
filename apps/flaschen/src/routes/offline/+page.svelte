<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { WifiOff } from '@lucide/svelte';
</script>

<div class="offline">
	<WifiOff size={48} strokeWidth={1.5} />
	<h1>Offline</h1>
	<p>You're offline. Reconnect to keep watching for shifts.</p>
	<a href="/" class="link">{m.nav_home()} →</a>
</div>

<style>
	.offline {
		max-width: 360px;
		margin: 80px auto;
		text-align: center;
		padding: 0 20px;
		color: var(--color-text-subtle);
	}
	h1 {
		margin-top: 16px;
		font-size: 22px;
		font-weight: 600;
		color: var(--color-text);
	}
	p {
		font-size: 14px;
		margin-top: 6px;
	}
	.link {
		display: inline-block;
		margin-top: 20px;
		font-size: 14px;
		font-weight: 600;
		color: var(--color-accent);
		text-decoration: none;
	}
</style>
