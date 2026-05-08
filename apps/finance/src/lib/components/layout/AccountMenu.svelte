<script lang="ts">
	import { page } from '$app/state';
	import { Settings, LogOut } from 'lucide-svelte';
	import type { User } from 'better-auth';
	import { PUBLIC_APP_VERSION } from '$env/static/public';

	let { user, displayName = null }: { user: User; displayName?: string | null } = $props();

	let open = $state(false);

	const name = $derived(
		displayName ||
			((user as Record<string, unknown>)?.name as string) ||
			user.email?.split('@')[0] ||
			'Account'
	);

	let avatarLoaded = $state(false);
	let avatarFailed = $state(false);
	const avatarUrl = $derived((user as Record<string, unknown>)?.image as string | undefined);

	const initials = $derived(
		name
			.split(' ')
			.slice(0, 2)
			.map((w: string) => w[0]?.toUpperCase() ?? '')
			.join('')
	);

	const currentPath = $derived(page.url.pathname as string);

	function toggle() {
		open = !open;
	}

	function close() {
		open = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="relative">
	<!-- Trigger -->
	<button
		type="button"
		onclick={toggle}
		aria-label="Account menu"
		aria-expanded={open}
		class="relative flex size-9 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
	>
		<span
			class="flex size-9 items-center justify-center rounded-full bg-primary-100 text-[13px] font-semibold text-primary-600 ring-2 ring-border"
		>
			{initials}
		</span>
		{#if avatarUrl && !avatarFailed}
			<img
				src={avatarUrl}
				alt={name}
				class="absolute inset-0 size-9 rounded-full object-cover ring-2 ring-border transition-opacity duration-200 {avatarLoaded
					? 'opacity-100'
					: 'opacity-0'}"
				onload={() => (avatarLoaded = true)}
				onerror={() => (avatarFailed = true)}
			/>
		{/if}
	</button>

	<!-- Dropdown -->
	{#if open}
		<!-- Backdrop -->
		<button
			type="button"
			class="fixed inset-0 z-40"
			onclick={close}
			aria-label="Close menu"
			tabindex="-1"
		></button>

		<div
			class="absolute top-full right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
			role="menu"
		>
			<!-- User info header -->
			<div class="flex items-center gap-3 px-4 py-3">
				<div class="relative size-10 flex-shrink-0">
					<span
						class="flex size-10 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-600"
					>
						{initials}
					</span>
					{#if avatarUrl && !avatarFailed}
						<img
							src={avatarUrl}
							alt={name}
							class="absolute inset-0 size-10 rounded-full object-cover transition-opacity duration-200 {avatarLoaded
								? 'opacity-100'
								: 'opacity-0'}"
							onload={() => (avatarLoaded = true)}
							onerror={() => (avatarFailed = true)}
						/>
					{/if}
				</div>
				<div class="min-w-0">
					<p class="truncate text-sm font-semibold">{name}</p>
					<p class="truncate text-[11px] text-neutral">{user.email}</p>
				</div>
			</div>

			<div class="flex items-center justify-between px-4 py-1.5">
				<span class="text-faint text-[10px]">v{PUBLIC_APP_VERSION}</span>
			</div>

			<div class="h-px bg-border"></div>

			<!-- Settings -->
			<a
				href="/settings"
				onclick={close}
				class="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-surface-muted {currentPath ===
				'/settings'
					? 'font-medium text-primary-500'
					: ''}"
				role="menuitem"
			>
				<Settings size={16} stroke-width={1.75} />
				Settings
			</a>

			<div class="h-px bg-border"></div>

			<!-- Sign out -->
			<form method="post" action="/auth/sign-out">
				<button
					type="submit"
					class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-expense transition-colors hover:bg-surface-muted"
					role="menuitem"
				>
					<LogOut size={16} stroke-width={1.75} />
					Sign out
				</button>
			</form>
		</div>
	{/if}
</div>
