export const KNOWN_APPS = [
	{ id: 'finance', label: 'Finance' },
	{ id: 'gym', label: 'Gym' },
	{ id: 'pomodoro', label: 'Pomodoro' }
] as const;

export type KnownAppId = (typeof KNOWN_APPS)[number]['id'];
