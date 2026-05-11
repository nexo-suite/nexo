import InviteEmail from './InviteEmail.js';

export default function InviteNoApps() {
	return InviteEmail({ landingUrl: 'https://krieger2501.de', apps: [] });
}

InviteNoApps.PreviewProps = {};
