import { db, users, accounts, expenses, income, debts } from '@nexo/db';
import { count, gte, and } from 'drizzle-orm';
import { dockerGet, dockerAction } from '$lib/server/docker';
import type { ContainerInfo, ContainerInspect } from '$lib/server/docker';
import { ctnComposeProfile, ctnName } from '$lib/utils/containers';
import { requireOwner } from '$lib/server/auth';
import { logger } from '$lib/server/logger';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export interface EnrichedContainer extends ContainerInfo {
	RestartCount: number;
	Profile: 'production' | 'preview' | 'unknown';
}

function startOf(unit: 'day' | 'week' | 'month'): Date {
	const now = new Date();
	if (unit === 'day') {
		return new Date(now.getFullYear(), now.getMonth(), now.getDate());
	}
	if (unit === 'week') {
		const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
		return d;
	}
	return new Date(now.getFullYear(), now.getMonth(), 1);
}

export const load: PageServerLoad = async ({ locals }) => {
	const today = startOf('day');
	const weekStart = startOf('week');
	const monthStart = startOf('month');

	const [
		rawContainers,
		totalUsers,
		totalAccounts,
		totalExpenses,
		totalIncome,
		totalDebts,
		usersToday,
		usersWeek,
		usersMonth,
		expensesToday,
		expensesWeek,
		expensesMonth,
		incomeToday,
		incomeWeek,
		incomeMonth
	] = await Promise.all([
		dockerGet<ContainerInfo[]>(
			`/containers/json?all=1&filters=${encodeURIComponent(JSON.stringify({ network: ['nexo-production', 'nexo-preview'] }))}`
		).catch((e) => {
			logger.error('docker list containers failed', {
				error: String(e),
				correlationId: locals.correlationId
			});
			return [] as ContainerInfo[];
		}),
		db.select({ value: count() }).from(users),
		db.select({ value: count() }).from(accounts),
		db.select({ value: count() }).from(expenses),
		db.select({ value: count() }).from(income),
		db.select({ value: count() }).from(debts),
		db.select({ value: count() }).from(users).where(gte(users.createdAt, today)),
		db.select({ value: count() }).from(users).where(gte(users.createdAt, weekStart)),
		db.select({ value: count() }).from(users).where(gte(users.createdAt, monthStart)),
		db
			.select({ value: count() })
			.from(expenses)
			.where(and(gte(expenses.createdAt, today))),
		db
			.select({ value: count() })
			.from(expenses)
			.where(and(gte(expenses.createdAt, weekStart))),
		db
			.select({ value: count() })
			.from(expenses)
			.where(and(gte(expenses.createdAt, monthStart))),
		db
			.select({ value: count() })
			.from(income)
			.where(and(gte(income.createdAt, today))),
		db
			.select({ value: count() })
			.from(income)
			.where(and(gte(income.createdAt, weekStart))),
		db
			.select({ value: count() })
			.from(income)
			.where(and(gte(income.createdAt, monthStart)))
	]);

	const containers: EnrichedContainer[] = await Promise.all(
		rawContainers.map(async (c) => {
			const inspect = await dockerGet<ContainerInspect>(`/containers/${c.Id}/json`).catch((e) => {
				logger.error('docker inspect failed', {
					containerId: c.Id,
					error: String(e),
					correlationId: locals.correlationId
				});
				return null;
			});
			return {
				...c,
				RestartCount: inspect?.RestartCount ?? 0,
				Profile: ctnComposeProfile(c)
			};
		})
	);

	return {
		containers,
		dbStats: {
			totals: {
				users: totalUsers[0]?.value ?? 0,
				accounts: totalAccounts[0]?.value ?? 0,
				expenses: totalExpenses[0]?.value ?? 0,
				income: totalIncome[0]?.value ?? 0,
				debts: totalDebts[0]?.value ?? 0
			},
			activity: {
				users: {
					today: usersToday[0]?.value ?? 0,
					week: usersWeek[0]?.value ?? 0,
					month: usersMonth[0]?.value ?? 0
				},
				expenses: {
					today: expensesToday[0]?.value ?? 0,
					week: expensesWeek[0]?.value ?? 0,
					month: expensesMonth[0]?.value ?? 0
				},
				income: {
					today: incomeToday[0]?.value ?? 0,
					week: incomeWeek[0]?.value ?? 0,
					month: incomeMonth[0]?.value ?? 0
				}
			}
		}
	};
};

export const actions: Actions = {
	restartProfile: async ({ request, locals }) => {
		requireOwner(locals);
		const data = await request.formData();
		const profile = String(data.get('profile') ?? '');
		if (profile !== 'production' && profile !== 'preview') {
			return fail(400, {
				error: 'BAD_PROFILE' as const,
				failed: [] as string[],
				correlationId: locals.correlationId
			});
		}

		const list = await dockerGet<ContainerInfo[]>(
			`/containers/json?filters=${encodeURIComponent(JSON.stringify({ network: [`nexo-${profile}`] }))}`
		).catch(() => [] as ContainerInfo[]);

		logger.info('restartProfile', {
			profile,
			count: list.length,
			correlationId: locals.correlationId
		});

		const results = await Promise.allSettled(
			list.map((c) => dockerAction(`/containers/${c.Id}/restart?t=10`))
		);
		const failed = results
			.map((r, i) => ({ r, name: ctnName(list[i]!) }))
			.filter(({ r }) => r.status === 'rejected')
			.map(({ name }) => name);

		if (failed.length > 0) {
			logger.error('restartProfile partial failure', {
				failed,
				correlationId: locals.correlationId
			});
			return fail(500, {
				error: 'RESTART_PARTIAL' as const,
				failed,
				correlationId: locals.correlationId
			});
		}
		return { success: true as const, restarted: list.length };
	}
};
