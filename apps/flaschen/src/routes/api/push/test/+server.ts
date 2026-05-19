import { testHandler } from '@nexo/push/routes';
import { m } from '$lib/paraglide/messages.js';

export const POST = testHandler('flaschen', () => ({
	title: m.notif_test_title(),
	body: m.notif_test_body(),
	url: '/devices'
}));
