import type { Language } from '@nexo/i18n';

export const ErrorCode = {
	UNKNOWN: 'UNKNOWN',
	DB_ERROR: 'DB_ERROR',
	FORBIDDEN: 'FORBIDDEN',
	NOT_FOUND: 'NOT_FOUND',
	CSRF_REJECTED: 'CSRF_REJECTED',
	VALIDATION_REQUIRED: 'VALIDATION_REQUIRED',
	VALIDATION_INVALID_EMAIL: 'VALIDATION_INVALID_EMAIL',
	SAVE_FAILED: 'SAVE_FAILED',
	DELETE_FAILED: 'DELETE_FAILED'
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const messages: Record<Language, Record<ErrorCode, string>> = {
	en: {
		UNKNOWN: "Well, that wasn't supposed to happen. Kevin probably broke something again.",
		DB_ERROR: 'The database is being dramatic. Give it a sec and try again.',
		FORBIDDEN: "Nice try, but you're not allowed in here.",
		NOT_FOUND: "Whatever you're looking for, it's not here. Maybe it never was.",
		CSRF_REJECTED: 'Your browser did something sketchy. Reload the page and try again.',
		VALIDATION_REQUIRED: "You left something empty that shouldn't be.",
		VALIDATION_INVALID_EMAIL: "That doesn't look like a real email address.",
		SAVE_FAILED: "Couldn't save that. Try again — if it keeps failing, poke Kevin.",
		DELETE_FAILED: 'That refused to be deleted. Try again or tell Kevin.'
	},
	de: {
		UNKNOWN: 'Naja, das war nicht geplant. Kevin hat wahrscheinlich wieder was kaputt gemacht.',
		DB_ERROR: 'Die Datenbank ist gerade dramatisch. Kurz warten und nochmal versuchen.',
		FORBIDDEN: 'Netter Versuch, aber du darfst hier nicht rein.',
		NOT_FOUND: 'Was auch immer du suchst — es ist nicht hier. War es vielleicht nie.',
		CSRF_REJECTED: 'Dein Browser hat was Komisches gemacht. Seite neu laden und nochmal versuchen.',
		VALIDATION_REQUIRED: 'Da ist was leer, das nicht leer sein sollte.',
		VALIDATION_INVALID_EMAIL: 'Das sieht nicht nach einer echten E-Mail-Adresse aus.',
		SAVE_FAILED:
			"Konnte nicht gespeichert werden. Nochmal versuchen — wenn's nicht klappt, Kevin anstupsen.",
		DELETE_FAILED: 'Das wollte nicht gelöscht werden. Nochmal versuchen oder Kevin Bescheid sagen.'
	},
	tr: {
		UNKNOWN: 'Hmm, bu olmamalıydı. Muhtemelen Kevin yine bir şeyler bozdu.',
		DB_ERROR: 'Veritabanı biraz drama yapıyor. Bir saniye bekle ve tekrar dene.',
		FORBIDDEN: 'Güzel deneme ama buraya girmen yasak.',
		NOT_FOUND: 'Ne arıyorsan burada yok. Belki hiç olmadı.',
		CSRF_REJECTED: 'Tarayıcın garip bir şey yaptı. Sayfayı yenile ve tekrar dene.',
		VALIDATION_REQUIRED: 'Boş bırakılmaması gereken bir yer boş kalmış.',
		VALIDATION_INVALID_EMAIL: 'Bu gerçek bir e-posta adresine benzemiyor.',
		SAVE_FAILED: "Kaydedilemedi. Tekrar dene — olmuyorsa Kevin'e söyle.",
		DELETE_FAILED: "Silinmek istemedi. Tekrar dene ya da Kevin'e haber ver."
	}
};

export function userMessage(code: string, lang: Language = 'en'): string {
	const langMessages = messages[lang] ?? messages.en;
	return langMessages[code as ErrorCode] ?? langMessages.UNKNOWN;
}
