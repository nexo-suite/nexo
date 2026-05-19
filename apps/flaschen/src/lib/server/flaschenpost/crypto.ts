import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { flaschenpostEnv } from './env';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function loadKey(): Buffer {
	const raw = flaschenpostEnv().FLASCHEN_TOKEN_ENC_KEY;
	if (!raw) throw new Error('FLASCHEN_TOKEN_ENC_KEY is not set');
	const key = Buffer.from(raw, 'base64');
	if (key.length !== 32) {
		throw new Error(
			`FLASCHEN_TOKEN_ENC_KEY must decode to 32 bytes (got ${key.length}). Generate one with \`openssl rand -base64 32\`.`
		);
	}
	return key;
}

let _key: Buffer | null = null;
function key(): Buffer {
	return (_key ??= loadKey());
}

/** Encrypt a UTF-8 string with AES-256-GCM. Output: base64(iv || ciphertext || tag). */
export function encrypt(plaintext: string): string {
	const iv = randomBytes(IV_LEN);
	const cipher = createCipheriv(ALGO, key(), iv);
	const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, ct, tag]).toString('base64');
}

export function decrypt(encoded: string): string {
	const buf = Buffer.from(encoded, 'base64');
	if (buf.length < IV_LEN + TAG_LEN) throw new Error('encrypted token too short');
	const iv = buf.subarray(0, IV_LEN);
	const tag = buf.subarray(buf.length - TAG_LEN);
	const ct = buf.subarray(IV_LEN, buf.length - TAG_LEN);
	const decipher = createDecipheriv(ALGO, key(), iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}
