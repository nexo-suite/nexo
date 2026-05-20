import http from 'http';
import { env } from '$env/dynamic/private';

const SOCKET_PATH = env.DOCKER_SOCKET ?? '/var/run/docker.sock';

export interface ContainerInfo {
	Id: string;
	Names: string[];
	Image: string;
	State: string;
	Status: string;
	Created: number;
	Labels?: Record<string, string>;
	NetworkSettings?: { Networks: Record<string, { IPAddress: string }> };
}

export interface ContainerInspect {
	Id: string;
	Name: string;
	Created: string;
	Image: string;
	RestartCount: number;
	State: {
		Status: string;
		Running: boolean;
		StartedAt: string;
		FinishedAt: string;
		ExitCode: number;
		Health?: {
			Status: string;
			FailingStreak: number;
			Log: { Start: string; ExitCode: number; Output: string }[];
		};
	};
	Config: {
		Image: string;
		Labels: Record<string, string>;
		ExposedPorts?: Record<string, unknown>;
	};
	NetworkSettings: {
		Networks: Record<string, { IPAddress: string; Aliases?: string[] | null }>;
	};
	HostConfig: {
		RestartPolicy: { Name: string; MaximumRetryCount: number };
	};
}

export function dockerGet<T>(path: string): Promise<T> {
	return new Promise((resolve, reject) => {
		const req = http.request({ socketPath: SOCKET_PATH, path, method: 'GET' }, (res) => {
			let data = '';
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => {
				try {
					resolve(JSON.parse(data) as T);
				} catch {
					reject(new Error('Failed to parse Docker API response'));
				}
			});
		});
		req.on('error', reject);
		req.end();
	});
}

export function dockerAction(path: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const req = http.request({ socketPath: SOCKET_PATH, path, method: 'POST' }, (res) => {
			let data = '';
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => {
				if (res.statusCode === 204 || res.statusCode === 304) {
					resolve();
					return;
				}
				if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
					resolve();
					return;
				}
				reject(new Error(`Docker API ${res.statusCode}: ${data || res.statusMessage}`));
			});
		});
		req.on('error', reject);
		req.end();
	});
}

export { SOCKET_PATH };

interface HealthzResponse {
	ok: boolean;
	version?: string;
	checks: Record<string, { ok: boolean; latency_ms?: number; error?: string }>;
	latency_ms?: number;
}

export interface HealthzResult {
	ok: boolean;
	status: number;
	body: HealthzResponse | null;
	error?: string;
	latency_ms: number;
	url: string;
}

function pickAlias(inspect: ContainerInspect): string | null {
	const service = inspect.Config?.Labels?.['com.docker.compose.service'];
	if (service) return service;
	const networks = inspect.NetworkSettings?.Networks ?? {};
	for (const net of Object.values(networks)) {
		const aliases = net?.Aliases ?? [];
		if (aliases.length > 0) return aliases[0]!;
	}
	return inspect.Name?.replace(/^\//, '') ?? null;
}

function pickPort(inspect: ContainerInspect): number {
	const exposed = inspect.Config?.ExposedPorts ?? {};
	for (const key of Object.keys(exposed)) {
		const m = key.match(/^(\d+)\//);
		if (m) return Number(m[1]);
	}
	return 3000;
}

interface ContainerStatsRaw {
	cpu_stats: {
		cpu_usage: { total_usage: number };
		system_cpu_usage?: number;
		online_cpus?: number;
	};
	precpu_stats: {
		cpu_usage: { total_usage: number };
		system_cpu_usage?: number;
		online_cpus?: number;
	};
	memory_stats: {
		usage?: number;
		limit?: number;
		stats?: { cache?: number };
	};
}

export interface ContainerStats {
	cpuPercent: number | null;
	memoryUsedBytes: number | null;
	memoryLimitBytes: number | null;
}

export async function fetchContainerStats(id: string): Promise<ContainerStats> {
	const raw = await dockerGet<ContainerStatsRaw>(
		`/containers/${encodeURIComponent(id)}/stats?stream=false&one-shot=true`
	).catch(() => null);
	if (!raw) return { cpuPercent: null, memoryUsedBytes: null, memoryLimitBytes: null };

	const cpuDelta = raw.cpu_stats.cpu_usage.total_usage - raw.precpu_stats.cpu_usage.total_usage;
	const sysDelta = (raw.cpu_stats.system_cpu_usage ?? 0) - (raw.precpu_stats.system_cpu_usage ?? 0);
	const onlineCpus = raw.cpu_stats.online_cpus ?? 1;
	let cpuPercent: number | null = null;
	if (cpuDelta > 0 && sysDelta > 0) {
		cpuPercent = (cpuDelta / sysDelta) * onlineCpus * 100;
	}

	const used = raw.memory_stats.usage ?? null;
	const cache = raw.memory_stats.stats?.cache ?? 0;
	const memoryUsedBytes = used !== null ? used - cache : null;
	const memoryLimitBytes = raw.memory_stats.limit ?? null;

	return { cpuPercent, memoryUsedBytes, memoryLimitBytes };
}

export async function fetchHealthz(
	inspect: ContainerInspect,
	timeoutMs = 5000
): Promise<HealthzResult> {
	const alias = pickAlias(inspect);
	const port = pickPort(inspect);
	const url = alias ? `http://${alias}:${port}/healthz` : '';
	const start = Date.now();
	if (!url) {
		return { ok: false, status: 0, body: null, error: 'NO_ALIAS', latency_ms: 0, url };
	}
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(url, { signal: controller.signal });
		const text = await res.text();
		const latency = Date.now() - start;
		let body: HealthzResponse | null = null;
		try {
			body = JSON.parse(text) as HealthzResponse;
		} catch {
			// not JSON — treat as opaque
		}
		return { ok: res.ok, status: res.status, body, latency_ms: latency, url };
	} catch (e) {
		return {
			ok: false,
			status: 0,
			body: null,
			error: String(e),
			latency_ms: Date.now() - start,
			url
		};
	} finally {
		clearTimeout(timer);
	}
}
