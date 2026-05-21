declare global {
	const __APP_VERSION__: string;
	const __APP_COMMIT__: string;
	const __APP_BUILD_TIME__: string;
	const __APP_VERSIONS__: { finance: string; auth: string; admin: string; landing: string };

	namespace App {
		interface Locals {
			user: {
				id: string;
				name: string;
				email: string;
				emailVerified: boolean;
				image?: string | null;
				createdAt: Date;
				updatedAt: Date;
			} | null;
			session: {
				id: string;
				token: string;
				userId: string;
				expiresAt: Date;
				ipAddress?: string | null;
				userAgent?: string | null;
			} | null;
		}
	}
}

export {};
