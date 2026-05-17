import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getLocale } from '$lib/paraglide/runtime.js';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const LOCALE_MAP: Record<string, string> = {
	en: 'en-GB',
	de: 'de-DE',
	tr: 'tr-TR'
};

export function getIntlLocale(): string {
	return LOCALE_MAP[getLocale()] ?? 'de-DE';
}

export function formatCurrency(amount: number, currency = 'EUR', hideCents = false): string {
	return new Intl.NumberFormat(getIntlLocale(), {
		style: 'currency',
		currency,
		minimumFractionDigits: hideCents ? 0 : 2,
		maximumFractionDigits: hideCents ? 0 : 2
	}).format(amount);
}

export const RECURRENCE_ORDER = [
	'weekly',
	'biweekly',
	'monthly',
	'quarterly',
	'half-yearly',
	'yearly'
];

const MONTHLY_FACTOR: Record<string, number> = {
	weekly: 52 / 12,
	biweekly: 26 / 12,
	monthly: 1,
	quarterly: 1 / 3,
	'half-yearly': 1 / 6,
	yearly: 1 / 12
};

export function normalizeToMonthly(amount: number, recurrence: string): number {
	return amount * (MONTHLY_FACTOR[recurrence] ?? 0);
}

export type WithElementRef<T, E extends HTMLElement = HTMLElement> = T & {
	ref?: E | null;
};

export type WithoutChildren<T> = Omit<T, 'children'>;
export type WithoutChild<T> = Omit<T, 'child'>;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
