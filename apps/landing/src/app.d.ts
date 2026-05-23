declare global {
	const __APP_VERSION_FALLBACK__: string;
	const __APP_COMMIT_FALLBACK__: string;
	const __APP_BUILD_TIME_FALLBACK__: string;
	const __APP_VERSIONS_FALLBACK__: {
		finance: string;
		auth: string;
		admin: string;
		flaschen: string;
		landing: string;
	};

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
