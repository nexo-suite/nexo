<script lang="ts">
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { UserAvatarMenu } from '@nexo/ui';
	import { Sparkles } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	type AppUser = { name?: string | null; email?: string | null; image?: string | null };
	type HubProfile = { displayName?: string | null } | null;

	const user = $derived(page.data.user as AppUser | null);
	const profile = $derived(page.data.profile as HubProfile);

	const hubUrl = env.PUBLIC_LANDING_URL
		? `${env.PUBLIC_LANDING_URL}/apps`
		: 'https://krieger2501.de/apps';

	const labels = $derived({
		account: m.chrome_account(),
		appsHub: m.chrome_app_hub(),
		signOut: m.chrome_sign_out()
	});

	function replayTour(close: () => void) {
		close();
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('flaschen:replay-onboarding'));
		}
	}
</script>

<UserAvatarMenu {user} displayName={profile?.displayName} {hubUrl} variant="subtle" {labels}>
	{#snippet extras({ close }: { close: () => void })}
		<button type="button" class="menu-row" onclick={() => replayTour(close)} role="menuitem">
			<Sparkles size={15} strokeWidth={1.7} />
			<span>{m.chrome_replay_tour()}</span>
		</button>
	{/snippet}
</UserAvatarMenu>
