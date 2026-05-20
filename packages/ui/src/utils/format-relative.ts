export function formatRelative(d: Date | string | null): string {
	if (!d) return '—';
	const ms = Date.now() - new Date(d).getTime();
	const min = Math.round(ms / 60000);
	if (min < 1) return 'just now';
	if (min < 60) return `${min} min ago`;
	const h = Math.round(min / 60);
	if (h < 24) return `${h} h ago`;
	return `${Math.round(h / 24)} d ago`;
}

export function defaultLabelFromUA(ua: string | null): string {
	if (!ua) return 'Device';
	if (/iPhone/i.test(ua)) return 'iPhone';
	if (/iPad/i.test(ua)) return 'iPad';
	if (/Android/i.test(ua)) return 'Android';
	if (/Mac/i.test(ua)) return 'Mac';
	if (/Windows/i.test(ua)) return 'Windows';
	return 'Browser';
}
