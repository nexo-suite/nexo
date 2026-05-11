import AccessGrantedEmail from './AccessGrantedEmail.js';

export default function AccessGrantedSingle() {
	return AccessGrantedEmail({
		name: 'Kevin Rieger',
		landingUrl: 'https://krieger2501.de',
		apps: [{ id: 'finance', label: 'Finance' }]
	});
}

AccessGrantedSingle.PreviewProps = {};
