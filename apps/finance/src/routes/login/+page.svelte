<script lang="ts">
	import logo from '$lib/assets/logo.webp';

	let { data } = $props();
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-6">
	<div class="w-full max-w-sm">
		<!-- Logo / wordmark -->
		<div class="mb-10 text-center">
			<div
				class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 shadow-lg shadow-primary-500/30"
			>
				<img src={logo} alt="Finance" class="h-9 w-9 object-contain" />
			</div>
			<h1 class="text-2xl font-bold tracking-tight">Finance</h1>
			<p class="mt-1 text-sm text-neutral">Your personal money overview</p>
		</div>

		<!-- Error hint -->
		{#if data?.error}
			<div class="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
				Sign-in failed or your account is not on the allowlist.
			</div>
		{/if}

		<!-- Auth buttons -->
		<div class="space-y-3">
			<a
				href="{data.authUrl}/login"
				class="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-surface
				       py-3.5 text-sm font-semibold shadow-sm transition-shadow hover:shadow-md active:scale-[0.98]"
			>
				Sign in
			</a>
		</div>

		<p class="mt-8 text-center text-xs text-neutral">
			Access is restricted to invited accounts only.
		</p>
	</div>
</div>
