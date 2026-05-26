<script lang="ts">
	import logo from '$lib/assets/logo.webp';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();
</script>

<div class="bg-bg-1 flex min-h-screen flex-col items-center justify-center px-6">
	<div class="w-full max-w-sm">
		<!-- Logo / wordmark -->
		<div class="mb-10 text-center">
			<div
				class="bg-primary-500 shadow-primary-500/30 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
			>
				<img src={logo} alt={m.login_heading()} class="h-9 w-9 object-contain" />
			</div>
			<h1 class="text-2xl font-bold tracking-tight">{m.login_heading()}</h1>
			<p class="text-text-subtle mt-1 text-sm">{m.login_subtitle()}</p>
		</div>

		<!-- Error hint -->
		{#if data?.error}
			<div class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
				{m.login_error()}
			</div>
		{/if}

		<!-- Auth buttons -->
		<div class="space-y-3">
			<a
				href="{data.authUrl}/login"
				class="border-border-default bg-surface-1 flex w-full items-center justify-center gap-3 rounded-2xl border
				       py-3.5 text-sm font-semibold shadow-sm transition-shadow hover:shadow-md active:scale-[0.98]"
			>
				{m.login_button()}
			</a>
		</div>

		<p class="text-text-subtle mt-8 text-center text-xs">
			{m.login_restricted()}
		</p>
	</div>
</div>
