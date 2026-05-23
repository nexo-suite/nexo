// ANSI styling without a dependency. CI runners and local terminals both honour
// these; if a consumer pipes output to a file the codes are harmless.
const COLOR = {
	reset: '\x1b[0m',
	dim: '\x1b[2m',
	bold: '\x1b[1m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	cyan: '\x1b[36m'
} as const;

function paint(color: keyof typeof COLOR, msg: string): string {
	return `${COLOR[color]}${msg}${COLOR.reset}`;
}

export function step(msg: string): void {
	console.log(`${paint('cyan', '›')} ${msg}`);
}

export function info(msg: string): void {
	console.log(`  ${paint('dim', msg)}`);
}

export function success(msg: string): void {
	console.log(`${paint('green', '✓')} ${msg}`);
}

export function fail(msg: string): never {
	console.error(`${paint('red', '✗')} ${msg}`);
	process.exit(1);
}

export function section(title: string): void {
	console.log(`\n${paint('bold', title)}`);
}
