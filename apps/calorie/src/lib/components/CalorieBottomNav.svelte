<script lang="ts">
	import { CalendarRange, House, User } from '@lucide/svelte';
	import { BottomNav } from '@nexo/ui';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';

	const tabs = $derived([
		{ href: '/', label: m.nav_today(), icon: House, exact: true },
		{ href: '/history', label: m.nav_history(), icon: CalendarRange },
		{ href: '/profile', label: m.nav_profile(), icon: User }
	]);
</script>

<BottomNav {tabs} currentPath={page.url.pathname} />
