import type { HandleClientError } from '@sveltejs/kit';
import { addDiagnosticError } from '@nexo/ui';

export const handleError: HandleClientError = ({ error, event }) => {
	const err = error instanceof Error ? error : null;
	addDiagnosticError('landing', {
		message: err?.message ?? String(error),
		stack: err?.stack,
		source: `route ${event.route.id ?? event.url.pathname}`
	});
	return {
		message: err?.message ?? 'Something went wrong',
		code: 'CLIENT_ERROR'
	};
};
