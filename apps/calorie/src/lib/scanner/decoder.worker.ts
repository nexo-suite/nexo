/// <reference lib="webworker" />
/**
 * Worker half of the barcode decoder. Owns zxing-wasm so the synchronous,
 * CPU-heavy decode never blocks the main thread.
 *
 * The wasm is fetched + instantiated up front (`fireImmediately: true`)
 * and a `ready` message is sent only once that succeeds — first scan
 * isn't slow, and a load failure is surfaced instead of silently failing
 * per frame (indistinguishable from "no barcode in frame").
 *
 * Same-origin wasm via Vite's `?url` keeps the scanner working offline
 * after install and avoids a third-party CDN in CSP.
 */
import { prepareZXingModule, readBarcodes, type ReaderOptions } from 'zxing-wasm/reader';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

const FORMATS = ['EAN13', 'EAN8', 'UPCA', 'UPCE'] as const;

// Speed-tuned for a realtime video path (zxing defaults favour accuracy):
//   maxNumberOfSymbols: 1  — we only ever read the first hit.
//   tryInvert: false       — retail codes are dark-on-light.
//   tryHarder: false       — "optimize for accuracy, not speed".
const READER_OPTIONS: ReaderOptions = {
	formats: [...FORMATS],
	maxNumberOfSymbols: 1,
	tryInvert: false,
	tryHarder: false
};

type InMessage = {
	type: 'decode';
	id: number;
	buffer: ArrayBuffer;
	width: number;
	height: number;
};

type OutMessage =
	| { type: 'ready' }
	| { type: 'init-error'; message: string }
	| { type: 'result'; id: number; text: string | null }
	| { type: 'error'; id: number; message: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const post = (msg: OutMessage) => ctx.postMessage(msg);
const errMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

prepareZXingModule({
	overrides: {
		locateFile: (path: string, prefix: string): string =>
			path.endsWith('.wasm') ? wasmUrl : prefix + path
	},
	fireImmediately: true
})
	.then(() => post({ type: 'ready' }))
	.catch((e: unknown) => post({ type: 'init-error', message: errMessage(e) }));

ctx.onmessage = async (ev: MessageEvent<InMessage>) => {
	const msg = ev.data;
	if (msg.type !== 'decode') return;
	try {
		const imageData = new ImageData(new Uint8ClampedArray(msg.buffer), msg.width, msg.height);
		const hits = await readBarcodes(imageData, READER_OPTIONS);
		post({ type: 'result', id: msg.id, text: hits[0]?.text ?? null });
	} catch (e: unknown) {
		post({ type: 'error', id: msg.id, message: errMessage(e) });
	}
};
