/// <reference types="vite-plugin-pwa/vanillajs" />
/// <reference types="vite-plugin-pwa/info" />
import type { User } from 'better-auth';

declare global {
	const __APP_VERSION__: string;
	const __APP_COMMIT__: string;
	const __APP_BUILD_TIME__: string;

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
