import http from 'http';
import { SOCKET_PATH } from '$lib/server/docker';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) => {
	const enc = new TextEncoder();

	const stream = new ReadableStream({
		start(controller) {
			const req = http.request(
				{
					socketPath: SOCKET_PATH,
					path: `/containers/${encodeURIComponent(params.name)}/logs?stdout=1&stderr=1&follow=1&tail=200&timestamps=1`,
					method: 'GET'
				},
				(res) => {
					let remainder = Buffer.alloc(0);

					res.on('data', (chunk: Buffer) => {
						// Prepend any leftover bytes from the previous chunk
						const data = Buffer.concat([remainder, chunk]);
						remainder = Buffer.alloc(0);

						let offset = 0;
						while (offset + 8 <= data.length) {
							const size = data.readUInt32BE(offset + 4);
							if (offset + 8 + size > data.length) {
								// Incomplete frame — save remainder for next chunk
								remainder = data.subarray(offset);
								break;
							}
							const line = data
								.subarray(offset + 8, offset + 8 + size)
								.toString('utf8')
								.trimEnd();
							if (line) {
								controller.enqueue(enc.encode(`data: ${JSON.stringify(line)}\n\n`));
							}
							offset += 8 + size;
						}
					});

					res.on('end', () => controller.close());
				}
			);

			req.on('error', () => controller.close());
			req.end();
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
