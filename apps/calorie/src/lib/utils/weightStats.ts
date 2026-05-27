export type WeightPoint = { date: string; kg: number };

export type Regression = { slopePerDay: number; intercept: number };

export type Pace = { kgPerWeek: number; slopePerDay: number; n: number };

export type EtaResult = { date: Date; offPace: boolean };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function dayOffset(date: string, anchor: string): number {
	const a = Date.parse(`${anchor}T00:00:00Z`);
	const b = Date.parse(`${date}T00:00:00Z`);
	return Math.round((b - a) / MS_PER_DAY);
}

export function linearRegression(points: WeightPoint[]): Regression | null {
	if (points.length < 2) return null;
	const anchor = points[0].date;
	const n = points.length;
	let sumX = 0;
	let sumY = 0;
	let sumXY = 0;
	let sumXX = 0;
	for (const p of points) {
		const x = dayOffset(p.date, anchor);
		sumX += x;
		sumY += p.kg;
		sumXY += x * p.kg;
		sumXX += x * x;
	}
	const denom = n * sumXX - sumX * sumX;
	if (denom === 0) return null;
	const slope = (n * sumXY - sumX * sumY) / denom;
	const intercept = (sumY - slope * sumX) / n;
	return { slopePerDay: slope, intercept };
}

export function computePace(allWeights: WeightPoint[], windowDays = 14): Pace | null {
	if (allWeights.length === 0) return null;
	const latest = allWeights[allWeights.length - 1].date;
	const cutoff = new Date(Date.parse(`${latest}T00:00:00Z`) - (windowDays - 1) * MS_PER_DAY)
		.toISOString()
		.slice(0, 10);
	const window = allWeights.filter((p) => p.date >= cutoff);
	if (window.length < 7) return null;
	const reg = linearRegression(window);
	if (!reg) return null;
	return { kgPerWeek: reg.slopePerDay * 7, slopePerDay: reg.slopePerDay, n: window.length };
}

export function computeEta(
	latestKg: number,
	latestDate: string,
	targetKg: number,
	slopePerDay: number
): EtaResult | null {
	const remaining = targetKg - latestKg;
	if (slopePerDay === 0 || !Number.isFinite(slopePerDay)) return null;
	const offPace = Math.sign(remaining) !== Math.sign(slopePerDay);
	const daysToTarget = remaining / slopePerDay;
	const date = new Date(Date.parse(`${latestDate}T00:00:00Z`) + daysToTarget * MS_PER_DAY);
	return { date, offPace };
}

export type EtaPhrase =
	| { kind: 'past'; absolute: string }
	| { kind: 'this_week' }
	| { kind: 'next_week' }
	| { kind: 'short_date'; absolute: string }
	| { kind: 'phase_month'; phase: 'early' | 'mid' | 'late'; month: string };

export function describeEta(eta: Date, today: Date, locale = 'en'): EtaPhrase {
	const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
	const etaUtc = Date.UTC(eta.getUTCFullYear(), eta.getUTCMonth(), eta.getUTCDate());
	const days = Math.round((etaUtc - todayUtc) / MS_PER_DAY);
	if (days <= 0) {
		return {
			kind: 'past',
			absolute: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(eta)
		};
	}
	if (days < 7) return { kind: 'this_week' };
	if (days < 15) return { kind: 'next_week' };
	if (days < 22) {
		return {
			kind: 'short_date',
			absolute: new Intl.DateTimeFormat(locale, {
				weekday: 'short',
				day: 'numeric',
				month: 'short'
			}).format(eta)
		};
	}
	const day = eta.getUTCDate();
	const phase = day <= 10 ? 'early' : day <= 20 ? 'mid' : 'late';
	const month = new Intl.DateTimeFormat(locale, { month: 'long' }).format(eta);
	return { kind: 'phase_month', phase, month };
}
