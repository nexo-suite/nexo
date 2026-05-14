export const LANGUAGES = ['en', 'de', 'tr'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'en';
