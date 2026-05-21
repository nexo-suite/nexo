<script lang="ts">
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { UserAvatarMenu } from '@nexo/ui';

	type AppUser = { name?: string | null; email?: string | null; image?: string | null };
	type HubProfile = { displayName?: string | null } | null;

	const user = $derived(page.data.user as AppUser | null);
	const profile = $derived(page.data.profile as HubProfile);

	const hubUrl = env.PUBLIC_LANDING_URL
		? `${env.PUBLIC_LANDING_URL}/apps`
		: 'https://krieger2501.de/apps';
</script>

<UserAvatarMenu {user} displayName={profile?.displayName} {hubUrl} />
