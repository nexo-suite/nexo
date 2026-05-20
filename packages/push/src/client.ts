export type EnableResult = { ok: true } | { ok: false; reason: string };
export type PermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
	const padding = '='.repeat((4 - (base64.length % 4)) % 4);
	const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
	const raw = atob(normalized);
	const out = new Uint8Array(new ArrayBuffer(raw.length));
	for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
	return out;
}

function isSupported(): boolean {
	return (
		typeof window !== 'undefined' &&
		'serviceWorker' in navigator &&
		'PushManager' in window &&
		'Notification' in window
	);
}

export async function getPermissionState(): Promise<PermissionState> {
	if (!isSupported()) return 'unsupported';
	return Notification.permission as PermissionState;
}

export async function getCurrentSubscription(): Promise<PushSubscription | null> {
	if (!isSupported()) return null;
	const reg = await navigator.serviceWorker.ready;
	return reg.pushManager.getSubscription();
}

export async function enableNotifications(opts: {
	app: string;
	vapidPublicKey: string;
	label?: string;
}): Promise<EnableResult> {
	console.info('[push] enableNotifications: start');
	if (!isSupported()) {
		console.info('[push] enableNotifications: unsupported');
		return { ok: false, reason: 'unsupported' };
	}

	console.info('[push] enableNotifications: awaiting serviceWorker.ready');
	const readyPromise = navigator.serviceWorker.ready;
	const timeoutPromise = new Promise<never>((_, reject) =>
		setTimeout(() => reject(new Error('serviceWorker.ready timed out after 5s')), 5000)
	);
	let reg: ServiceWorkerRegistration;
	try {
		reg = await Promise.race([readyPromise, timeoutPromise]);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		console.error('[push] serviceWorker.ready failed:', msg);
		return { ok: false, reason: `sw-ready-failed: ${msg}` };
	}
	console.info('[push] enableNotifications: SW ready', reg.active?.scriptURL);

	console.info('[push] enableNotifications: requesting permission');
	const perm = await Notification.requestPermission();
	console.info('[push] enableNotifications: permission =', perm);
	if (perm !== 'granted') return { ok: false, reason: perm };

	let sub = await reg.pushManager.getSubscription();
	if (!sub) {
		if (!opts.vapidPublicKey || opts.vapidPublicKey.length < 80) {
			console.error('[push] missing or malformed VAPID public key');
			return { ok: false, reason: 'missing-vapid-key' };
		}
		try {
			console.info('[push] enableNotifications: subscribing');
			sub = await reg.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(opts.vapidPublicKey)
			});
		} catch (err) {
			console.error('[push] subscribe failed:', err);
			return { ok: false, reason: `subscribe-failed: ${(err as Error).message}` };
		}
	}

	console.info('[push] enableNotifications: posting to /api/push/subscribe');
	const res = await fetch('/api/push/subscribe', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			app: opts.app,
			label: opts.label ?? null,
			subscription: sub.toJSON()
		})
	});

	if (!res.ok) {
		console.error('[push] subscribe endpoint returned', res.status);
		return { ok: false, reason: `server-${res.status}` };
	}
	console.info('[push] enableNotifications: success');
	return { ok: true };
}

export async function disableNotifications(): Promise<{ ok: boolean }> {
	if (!isSupported()) return { ok: false };
	const reg = await navigator.serviceWorker.ready;
	const sub = await reg.pushManager.getSubscription();
	if (!sub) return { ok: true };

	const endpoint = sub.endpoint;
	await sub.unsubscribe().catch(() => undefined);

	await fetch('/api/push/unsubscribe', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ endpoint })
	});

	return { ok: true };
}

export async function sendTest(): Promise<{ ok: boolean }> {
	const res = await fetch('/api/push/test', { method: 'POST' });
	return { ok: res.ok };
}

export function isStandalone(): boolean {
	if (typeof window === 'undefined') return false;
	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		(navigator as Navigator & { standalone?: boolean }).standalone === true
	);
}
