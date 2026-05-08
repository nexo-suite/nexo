import type {
	Account as DbAccount,
	Expense as DbExpense,
	Income as DbIncome,
	Debt as DbDebt
} from '@nexo/db';

export type Account = Omit<DbAccount, 'balance'> & { balance: number };
export type Expense = Omit<DbExpense, 'amount'> & { amount: number };
export type Income = Omit<DbIncome, 'amount'> & { amount: number };
export type Debt = Omit<DbDebt, 'amount'> & { amount: number };

export interface UpcomingEvent {
	id: string;
	label: string;
	amount: number;
	date: string;
	type: 'expense' | 'income' | 'debt';
}
