/** Tipe data API — mengikuti kontrak Swagger caupocket-api. */

export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  balance: number;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon_name: string;
}

export interface SavingGoal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  status: 'ACTIVE' | 'ACHIEVED';
  created_at: string;
}

export interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE' | 'GOAL_FUNDING';
  amount: number;
  description: string;
  trx_date: string;
  wallet_id: string;
  wallet_name: string;
  category_id: string | null;
  category_name: string | null;
  goal_id: string | null;
  goal_title: string | null;
}
