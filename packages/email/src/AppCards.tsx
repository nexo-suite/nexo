import { Section } from '@react-email/components';
import * as React from 'react';

export interface AppInfo {
	id: string;
	label: string;
}

function FinanceIcon() {
	return (
		<svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect width="100" height="100" rx="22" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1"/>
			<path d="M22 68 L42 48 L56 60 L78 32" fill="none" stroke="#16a34a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
			<path d="M64 32 L78 32 L78 46" fill="none" stroke="#16a34a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
		</svg>
	);
}

function GymIcon() {
	return (
		<svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect width="100" height="100" rx="22" fill="#2563eb"/>
			<rect x="22" y="36" width="10" height="28" rx="2" fill="#ffffff"/>
			<rect x="68" y="36" width="10" height="28" rx="2" fill="#ffffff"/>
			<rect x="16" y="42" width="6" height="16" rx="2" fill="#ffffff"/>
			<rect x="78" y="42" width="6" height="16" rx="2" fill="#ffffff"/>
			<rect x="32" y="46" width="36" height="8" rx="2" fill="#ffffff"/>
		</svg>
	);
}

function NexoIcon() {
	return (
		<svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect width="100" height="100" rx="22" fill="#0f2010"/>
			<circle cx="30" cy="30" r="6" fill="#16a34a"/>
			<circle cx="70" cy="70" r="6" fill="#16a34a"/>
			<path d="M30 36 L30 70 M70 30 L70 64" stroke="#16a34a" strokeWidth="8" strokeLinecap="round"/>
			<path d="M33 33 L67 67" stroke="#16a34a" strokeWidth="8" strokeLinecap="round"/>
		</svg>
	);
}

const APP_ICONS: Record<string, React.ReactElement> = {
	finance: <FinanceIcon />,
	gym: <GymIcon />
};

const APP_META: Record<
	string,
	{ accentColor: string; bgColor: string; borderColor: string; features: string[] }
> = {
	finance: {
		accentColor: '#16a34a',
		bgColor: '#f0fdf4',
		borderColor: '#86efac',
		features: [
			'Track income & expenses',
			'Spending breakdown by category',
			'Manage debts & commitments'
		]
	},
	gym: {
		accentColor: '#2563eb',
		bgColor: '#eff6ff',
		borderColor: '#93c5fd',
		features: ['Log workouts & sets', 'Track personal records', 'View progress over time']
	},
	pomodoro: {
		accentColor: '#dc2626',
		bgColor: '#fef2f2',
		borderColor: '#fca5a5',
		features: ['Focus timer with short breaks', 'Daily session history', 'Customisable intervals']
	}
};

const FALLBACK = {
	accentColor: '#7c3aed',
	bgColor: '#faf5ff',
	borderColor: '#c4b5fd',
	features: ['Powerful new tools', 'Seamlessly integrated', 'Always improving']
};

interface AppCardsProps {
	apps: AppInfo[];
}

export function AppCards({ apps }: AppCardsProps) {
	return (
		<Section style={section}>
			{apps.map((app, i) => {
				const meta = APP_META[app.id] ?? FALLBACK;
				const icon = APP_ICONS[app.id] ?? <NexoIcon />;
				return (
					<div
						key={app.id}
						style={{
							...card,
							borderColor: meta.borderColor,
							marginBottom: i < apps.length - 1 ? '10px' : '0'
						}}
					>
						{/* App header row: icon + name badge */}
						<table
							cellPadding="0"
							cellSpacing="0"
							style={{ width: '100%', marginBottom: '12px' }}
						>
							<tbody>
								<tr>
									<td style={appHeaderLeft}>
										<span style={iconBox}>{icon}</span>
										<span
											style={{
												...namePill,
												backgroundColor: meta.bgColor,
												color: meta.accentColor,
												borderColor: meta.borderColor
											}}
										>
											{app.label}
										</span>
									</td>
								</tr>
							</tbody>
						</table>
						{/* Feature list */}
						{meta.features.map((f, fi) => (
							<table
								key={fi}
								cellPadding="0"
								cellSpacing="0"
								style={{ width: '100%', marginBottom: '4px' }}
							>
								<tbody>
									<tr>
										<td style={checkCell}>
											<span style={{ ...checkIcon, color: meta.accentColor }}>✓</span>
										</td>
										<td style={featureCell}>{f}</td>
									</tr>
								</tbody>
							</table>
						))}
					</div>
				);
			})}
		</Section>
	);
}

const section: React.CSSProperties = {
	marginBottom: '28px'
};

const card: React.CSSProperties = {
	borderRadius: '10px',
	border: '1px solid',
	backgroundColor: '#ffffff',
	padding: '16px 18px'
};

const appHeaderLeft: React.CSSProperties = {
	verticalAlign: 'middle'
};

const iconBox: React.CSSProperties = {
	display: 'inline-block',
	width: '32px',
	height: '32px',
	borderRadius: '8px',
	overflow: 'hidden',
	marginRight: '10px',
	verticalAlign: 'middle'
};

const namePill: React.CSSProperties = {
	display: 'inline-block',
	fontSize: '12px',
	fontWeight: '700',
	letterSpacing: '0.05em',
	textTransform: 'uppercase',
	padding: '3px 10px',
	borderRadius: '999px',
	border: '1px solid',
	verticalAlign: 'middle'
};

const checkCell: React.CSSProperties = {
	width: '20px',
	verticalAlign: 'top',
	paddingTop: '1px'
};

const checkIcon: React.CSSProperties = {
	fontSize: '13px',
	fontWeight: '700',
	lineHeight: '1.5'
};

const featureCell: React.CSSProperties = {
	fontSize: '13px',
	color: '#52525b',
	lineHeight: '1.5',
	paddingLeft: '4px'
};
