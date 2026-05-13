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
	};
	NetworkSettings: {
		Networks: Record<string, { IPAddress: string }>;
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

export { SOCKET_PATH };
