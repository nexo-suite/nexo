import {
	Body,
	Container,
	Head,
	Heading,
	Html,
	Preview,
	Section,
	Text
} from '@react-email/components';
import * as React from 'react';
import { AppCards, type AppInfo } from '../AppCards.js';

interface AccessGrantedEmailProps {
	name: string;
	apps: AppInfo[];
	landingUrl: string;
}

export default function AccessGrantedEmail({ name, apps, landingUrl }: AccessGrantedEmailProps) {
	const appListLabel = apps.map((a) => a.label).join(', ');
	const firstName = name.split(' ')[0];

	return (
		<Html>
			<Head />
			<Preview>You now have access to {appListLabel} on Nexo</Preview>
			<Body style={body}>
				<Container style={wrapper}>
					{/* ── Hero ── */}
					<Section style={hero}>
						<table cellPadding="0" cellSpacing="0" style={heroTable}>
							<tbody>
								<tr>
									<td style={heroLeft}>
										<span style={eyebrow}>Nexo</span>
										<Heading style={heroHeading}>New access, {firstName} 🎉</Heading>
									</td>
									<td style={heroRight}>
										<table cellPadding="0" cellSpacing="0" style={heroIcon}>
											<tbody>
												<tr>
													<td style={heroIconCell}>
														<svg width="26" height="26" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
															<circle cx="30" cy="30" r="6" fill="#4ade80"/>
															<circle cx="70" cy="70" r="6" fill="#4ade80"/>
															<path d="M30 36 L30 70 M70 30 L70 64" stroke="#4ade80" strokeWidth="8" strokeLinecap="round"/>
															<path d="M33 33 L67 67" stroke="#4ade80" strokeWidth="8" strokeLinecap="round"/>
														</svg>
													</td>
												</tr>
											</tbody>
										</table>
									</td>
								</tr>
							</tbody>
						</table>
						<Text style={heroSub}>
							{apps.length === 1 ? 'A new app has' : `${apps.length} new apps have`} been unlocked
							for your account.
						</Text>
					</Section>

					{/* ── Body ── */}
					<Section style={bodySection}>
						<Text style={bodyIntro}>Here's what you now have access to:</Text>

						<AppCards apps={apps} />

						<table cellPadding="0" cellSpacing="0" style={{ marginTop: '8px' }}>
							<tbody>
								<tr>
									<td style={ctaTd}>
										<a href={landingUrl} style={ctaLink}>
											Open Nexo &nbsp;→
										</a>
									</td>
								</tr>
							</tbody>
						</table>
					</Section>

					{/* ── Footer ── */}
					<Section style={footerSection}>
						<Text style={footerText}>
							You're receiving this because an admin granted you access on Nexo. If this wasn't
							expected, contact the admin.
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

export function subject(apps: AppInfo[]): string {
	return `You now have access to ${apps.map((a) => a.label).join(', ')}`;
}

AccessGrantedEmail.PreviewProps = {
	name: 'Kevin Rieger',
	landingUrl: 'https://krieger2501.de',
	apps: [
		{ id: 'finance', label: 'Finance' },
		{ id: 'pomodoro', label: 'Pomodoro' }
	]
} satisfies AccessGrantedEmailProps;

// ─── Styles ──────────────────────────────────────────────────────────────────

const body: React.CSSProperties = {
	backgroundColor: '#eef2ee',
	fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
	margin: 0,
	padding: '32px 12px'
};

const wrapper: React.CSSProperties = {
	maxWidth: '500px',
	margin: '0 auto',
	borderRadius: '14px',
	overflow: 'hidden',
	boxShadow: '0 2px 20px rgba(0,0,0,0.11)'
};

const hero: React.CSSProperties = {
	background: 'linear-gradient(150deg, #0c1a0c 0%, #163016 55%, #1e5c2a 100%)',
	padding: '28px 28px 24px'
};

const heroTable: React.CSSProperties = {
	width: '100%',
	marginBottom: '10px'
};

const heroLeft: React.CSSProperties = {
	verticalAlign: 'bottom'
};

const heroRight: React.CSSProperties = {
	verticalAlign: 'top',
	textAlign: 'right',
	width: '44px'
};

const heroIcon: React.CSSProperties = {
	width: '44px',
	height: '44px',
	borderRadius: '12px',
	background: 'rgba(255,255,255,0.10)',
	border: '1px solid rgba(255,255,255,0.15)',
	marginLeft: 'auto'
};

const heroIconCell: React.CSSProperties = {
	width: '44px',
	height: '44px',
	textAlign: 'center',
	verticalAlign: 'middle'
};

const eyebrow: React.CSSProperties = {
	display: 'block',
	fontSize: '11px',
	fontWeight: '700',
	letterSpacing: '0.1em',
	textTransform: 'uppercase',
	color: '#4ade80',
	marginBottom: '6px'
};

const heroHeading: React.CSSProperties = {
	fontSize: '24px',
	fontWeight: '700',
	color: '#ffffff',
	letterSpacing: '-0.02em',
	lineHeight: '1.15',
	margin: 0
};

const heroSub: React.CSSProperties = {
	fontSize: '14px',
	color: 'rgba(255,255,255,0.60)',
	lineHeight: '1.6',
	margin: 0
};

const bodySection: React.CSSProperties = {
	backgroundColor: '#ffffff',
	padding: '28px 28px 24px'
};

const bodyIntro: React.CSSProperties = {
	fontSize: '14px',
	color: '#3f3f46',
	lineHeight: '1.65',
	margin: '0 0 20px'
};

const ctaTd: React.CSSProperties = {
	borderRadius: '9px',
	backgroundColor: '#16a34a'
};

const ctaLink: React.CSSProperties = {
	display: 'inline-block',
	backgroundColor: '#16a34a',
	borderRadius: '9px',
	color: '#ffffff',
	fontSize: '14px',
	fontWeight: '600',
	padding: '12px 24px',
	textDecoration: 'none',
	letterSpacing: '0.01em'
};

const footerSection: React.CSSProperties = {
	backgroundColor: '#f7f7f6',
	borderTop: '1px solid #e7e5e4',
	padding: '16px 28px 20px'
};

const footerText: React.CSSProperties = {
	fontSize: '12px',
	color: '#a8a29e',
	lineHeight: '1.6',
	margin: 0
};
