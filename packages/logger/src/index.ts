type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const COLORS: Record<LogLevel, string> = {
	info: '\x1b[36m',
	warn: '\x1b[33m',
	error: '\x1b[31m',
	debug: '\x1b[90m'
};
const RESET = '\x1b[0m';

export function createLogger(service: string) {
	function log(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
		if (process.env.NODE_ENV !== 'production') {
			const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
			console.log(`${COLORS[level]}[${level.toUpperCase()}]${RESET} [${service}] ${msg}${metaStr}`);
		} else {
			console.log(JSON.stringify({ level, ts: new Date().toISOString(), service, msg, ...meta }));
		}
	}
	return {
		info: (msg: string, meta?: Record<string, unknown>) => log('info', msg, meta),
		warn: (msg: string, meta?: Record<string, unknown>) => log('warn', msg, meta),
		error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
		debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta)
	};
}
