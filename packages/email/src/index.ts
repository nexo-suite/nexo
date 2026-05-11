import { render } from '@react-email/components';
import * as React from 'react';
import { Resend } from 'resend';
import AccessGrantedEmail, { subject as accessSubject } from './templates/AccessGrantedEmail.js';
import InviteEmail, { subject as inviteSubject } from './templates/InviteEmail.js';

export type { AppInfo } from './AppCards.js';

const FROM = 'Nexo <hello@mail.krieger2501.de>';

export async function sendInviteEmail({
	apiKey,
	to,
	landingUrl,
	apps = []
}: {
	apiKey: string;
	to: string;
	landingUrl: string;
	apps?: { id: string; label: string }[];
}) {
	const html = await render(React.createElement(InviteEmail, { landingUrl, apps }));
	return new Resend(apiKey).emails.send({ from: FROM, to, subject: inviteSubject, html });
}

export async function sendAccessGrantedEmail({
	apiKey,
	to,
	name,
	apps,
	landingUrl
}: {
	apiKey: string;
	to: string;
	name: string;
	apps: { id: string; label: string }[];
	landingUrl: string;
}) {
	const html = await render(React.createElement(AccessGrantedEmail, { name, apps, landingUrl }));
	return new Resend(apiKey).emails.send({ from: FROM, to, subject: accessSubject(apps), html });
}
