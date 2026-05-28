/**
 * Main-thread half of the barcode decoder.
 *
 * Responsibilities (everything that MUST run on the main thread):
 *   • draw the current video frame into a canvas
 *   • crop to a region of interest (ROI) and downscale it
 *   • read the pixels with getImageData
 *   • transfer them to the worker and await a result
 *
 * The actual zxing-wasm decode runs in decoder.worker.ts so it never
 * blocks rendering or touch handling — the main source of jank (and the
 * suspected cause of iOS PWA black-screen video) is decoding a full
 * 1080p frame on the main thread.
 *
 * Why crop + downscale here (not just hand zxing the whole frame):
 *   • zxing grayscales and scans every pixel it receives. A 1080p frame
 *     is ~8 MB and ~2M pixels per call; a cropped, downscaled band is a
 *     fraction of that. zxing's own `tryDownscale` only helps internal
 *     detection passes — it does not shrink the buffer we allocate and
 *     copy each frame.
 *
 * Why "drop when busy":
 *   • Realtime stream. If the worker is still decoding the previous
 *     frame, queueing a new one just builds latency. Skipping returns
 *     null, indistinguishable from "no barcode in frame".
 */
export type DecodeFn = (video: HTMLVideoElement) => Promise<string | null>;

export interface DecoderOptions {
	/** ROI as fractions (0..1) of the frame. Default: a wide central band. */
	roi?: { x: number; y: number; w: number; h: number };
	/** Longest side (px) of the image after downscaling. */
	maxDimension?: number;
}

const DEFAULT_ROI = { x: 0.1, y: 0.3, w: 0.8, h: 0.4 };
const DEFAULT_MAX_DIM = 800;

export function makeDecoder(options: DecoderOptions = {}): Promise<DecodeFn> {
	const roi = options.roi ?? DEFAULT_ROI;
	const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIM;

	const worker = new Worker(new URL('./decoder.worker.ts', import.meta.url), { type: 'module' });

	let canvas: HTMLCanvasElement | null = null;
	let ctx: CanvasRenderingContext2D | null = null;

	let nextId = 1;
	const pending = new Map<number, (text: string | null) => void>();

	// True only while a frame is genuinely in the worker. Early skips and
	// pre-decode errors resolve null without ever flipping it.
	let busy = false;

	return new Promise<DecodeFn>((resolveReady, rejectReady) => {
		worker.onmessage = (ev: MessageEvent) => {
			const msg = ev.data;
			switch (msg.type) {
				case 'ready':
					resolveReady(decode);
					break;

				case 'init-error':
					rejectReady(new Error(`scanner: wasm init failed: ${msg.message}`));
					break;

				case 'result': {
					const resolve = pending.get(msg.id);
					if (resolve) {
						pending.delete(msg.id);
						busy = false;
						resolve(msg.text);
					}
					break;
				}

				case 'error': {
					const resolve = pending.get(msg.id);
					if (resolve) {
						pending.delete(msg.id);
						busy = false;
						resolve(null);
					}
					console.warn('scanner: readBarcodes failed', msg.message);
					break;
				}
			}
		};

		worker.onerror = (e) => {
			rejectReady(new Error(`scanner: worker error: ${e.message}`));
		};

		const decode: DecodeFn = (video) =>
			new Promise<string | null>((resolve) => {
				if (busy) return resolve(null);
				if (video.videoWidth === 0 || video.videoHeight === 0) return resolve(null);

				if (!canvas) {
					canvas = document.createElement('canvas');
					ctx = canvas.getContext('2d', { willReadFrequently: true });
				}
				if (!ctx) return resolve(null);

				const sx = Math.round(roi.x * video.videoWidth);
				const sy = Math.round(roi.y * video.videoHeight);
				const sw = Math.round(roi.w * video.videoWidth);
				const sh = Math.round(roi.h * video.videoHeight);

				// Downscale so the longest side <= maxDimension (never scale up).
				const scale = Math.min(1, maxDimension / Math.max(sw, sh));
				const dw = Math.max(1, Math.round(sw * scale));
				const dh = Math.max(1, Math.round(sh * scale));

				if (canvas.width !== dw) canvas.width = dw;
				if (canvas.height !== dh) canvas.height = dh;

				// drawImage does the crop (src rect) and downscale (dst rect) in one pass.
				ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);

				let imageData: ImageData;
				try {
					imageData = ctx.getImageData(0, 0, dw, dh);
				} catch (e) {
					console.warn('scanner: getImageData failed', e);
					return resolve(null);
				}

				const id = nextId++;
				pending.set(id, resolve);
				busy = true;

				// Transfer the pixel buffer (zero-copy). It's neutralized on the
				// main thread afterwards, but we re-read a fresh one next frame.
				const buffer = imageData.data.buffer;
				worker.postMessage({ type: 'decode', id, buffer, width: dw, height: dh }, [buffer]);
			});
	});
}
