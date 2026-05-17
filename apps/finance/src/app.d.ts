import type { User } from 'better-auth';

declare global {
	const __APP_VERSION__: string;

	namespace App {
		interface Error {
			message: string;
			code?: string;
			correlationId?: string;
		}
		interface Locals {
			user: User | null;
			correlationId: string;
		}
		interface PageData {
			user?: User | null;
		}
		// eslint-disable-next-line @typescript-eslint/no-empty-object-type
		interface Platform {}
	}
}

export {};
