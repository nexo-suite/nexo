import AccessGrantedEmail from './AccessGrantedEmail.js';

export default function AccessGrantedAll() {
	return AccessGrantedEmail({
		name: 'Kevin Rieger',
		landingUrl: 'https://krieger2501.de',
		apps: [
			{ id: 'finance', label: 'Finance' },
			{ id: 'gym', label: 'Gym' },
			{ id: 'pomodoro', label: 'Pomodoro' }
		]
	});
}

AccessGrantedAll.PreviewProps = {};
