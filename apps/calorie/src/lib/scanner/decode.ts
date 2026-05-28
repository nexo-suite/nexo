/**
 * Decoder reads frames from a <video> element and resolves a barcode string or null.
 *
 * Why we always use zxing-wasm and skip the native BarcodeDetector path:
 *   • iOS Safari 17+ ships BarcodeDetector but its implementation does not
 *     reliably detect from live <video> sources — it returns empty arrays
 *     even with a barcode clearly in frame. Falling back is hard to detect
 *     ("no hits" looks the same as "no barcode in frame"), so for a 5-10
 *     user PWA we trade a little bundle size for deterministic behaviour.
 *
 * Why ImageData (not a PNG Blob):
 *   • zxing-wasm v3 accepts ImageData directly. Skipping `canvas.toBlob`
 *     avoids per-frame PNG encoding (~hundreds of ms on phones), which
 *     used to bottleneck the decode loop.
 *
 * Why we configure `locateFile`:
 *   • The library defaults to fetching the wasm from `fastly.jsdelivr.net`.
 *     For an installable PWA we want same-origin assets so the scanner
 *     works offline (after first install) and doesn't require a third-party
 *     CDN allowance in CSP. Vite resolves the `?url` import to a hashed
 *     bundled asset on our origin.
 */

import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

export type DecodeFn = (video: HTMLVideoElement) => Promise<string | null>;

// Retail/grocery formats only — keeps the decoder focused and faster.
const FORMATS = ['EAN13', 'EAN8', 'UPCA', 'UPCE'] as const;

let zxingPrepared = false;
function ensureZxingPrepared(): void {
	if (zxingPrepared) return;
	prepareZXingModule({
		overrides: {
			locateFile: (path: string, prefix: string): string =>
				path.endsWith('.wasm') ? wasmUrl : prefix + path
		}
	});
	zxingPrepared = true;
}

export async function makeDecoder(): Promise<DecodeFn> {
	ensureZxingPrepared();

	// One reusable canvas — allocating per frame churns GC and is visibly
	// jankier on iOS than reusing.
	let canvas: HTMLCanvasElement | null = null;
	let ctx: CanvasRenderingContext2D | null = null;

	return async (video) => {
		if (video.videoWidth === 0 || video.videoHeight === 0) return null;

		if (!canvas) {
			canvas = document.createElement('canvas');
			ctx = canvas.getContext('2d', { willReadFrequently: true });
		}
		if (!ctx) return null;

		// Match the canvas to the current video frame size (it can change if
		// the camera switches resolution mid-stream).
		if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
		if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

		ctx.drawImage(video, 0, 0);

		let imageData: ImageData;
		try {
			imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		} catch (e) {
			console.warn('scanner: getImageData failed', e);
			return null;
		}

		try {
			const hits = await readBarcodes(imageData, { formats: [...FORMATS] });
			return hits[0]?.text ?? null;
		} catch (e) {
			console.warn('scanner: readBarcodes failed', e);
			return null;
		}
	};
}
