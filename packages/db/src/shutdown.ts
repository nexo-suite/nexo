import { closeDb } from './index.js';

type Cleanup = () => Promise<void> | void;

const cleanups: Cleanup[] = [];
let registered = false;
let shuttingDown = false;

export function onShutdown(fn: Cleanup): void {
	cleanups.push(fn);
}

export function registerShutdown(): void {
	if (registered) return;
	registered = true;

	const handler = async (signal: string) => {
		if (shuttingDown) return;
		shuttingDown = true;
		for (const fn of cleanups) {
			try {
				await fn();
			} catch (e) {
				console.error(`[shutdown] cleanup failed (${signal}):`, e);
			}
		}
		try {
			await closeDb();
		} catch (e) {
			console.error(`[shutdown] closeDb failed (${signal}):`, e);
		}
	};

	process.on('SIGTERM', () => void handler('SIGTERM'));
	process.on('SIGINT', () => void handler('SIGINT'));
}
