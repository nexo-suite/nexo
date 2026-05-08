import type { UserConfig } from 'vite';

export const sharedConfig: UserConfig = {
	resolve: {
		extensions: ['.ts', '.js', '.svelte']
	}
};
