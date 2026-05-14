import type { User } from '@nexo/db';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
		}
	}
}

export {};
