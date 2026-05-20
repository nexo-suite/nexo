import { testHandler } from '@nexo/push/routes';

export const POST = testHandler('admin', () => ({
	title: 'Admin test',
	body: 'Push notifications are working.',
	url: '/settings'
}));
