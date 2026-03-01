import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface Budget {
  id: number;
  name: string;
  icon?: string | null;
  category?: string | null;
  balance: string;
  description?: string | null;
  target?: number;
  budget_date?: string | null;
  repeat_this_budget?: boolean;
  currency_unit?: string;
  wallet_id?: number | null;
}

export interface Transaction {
  id: number;
  jar_id: number;
  amount: string;
  type: 'income' | 'expense';
  category?: string;
  source?: string;
  note?: string;
  created_at: string;
  spent_at?: string;
  received_at?: string;
  date?: string;
}

export interface PaginatedTransactions {
  data: Transaction[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

@Injectable({ providedIn: 'root' })
export class BudgetService {
  constructor(private api: ApiService) {}

  list() {
    return this.api.get<Budget[]>('budgets');
  }

  detail(id: number) {
    return this.api.get<Budget>(`budgets/${id}`);
  }

  create(payload: {
    name?: string;
    category?: string;
    icon?: string;
    description?: string | null;
    balance?: number;
    amount?: number;
    currency_unit?: string;
    budget_date?: string;
    repeat_this_budget?: boolean;
    wallet_id?: number | null;
  }) {
    return this.api.post<Budget>('budgets', payload);
  }

  update(id: number, payload: {
    name?: string;
    category?: string;
    icon?: string;
    description?: string | null;
    balance?: number;
    amount?: number;
    currency_unit?: string;
    budget_date?: string | null;
    repeat_this_budget?: boolean;
    wallet_id?: number | null;
  }) {
    return this.api.patch<Budget>(`budgets/${id}`, payload);
  }

  remove(id: number) {
    return this.api.delete<{ message: string }>(`budgets/${id}`);
  }

  getTransactions(budgetId: number) {
    return this.api.get<PaginatedTransactions>(`budgets/${budgetId}/transactions`);
  }

  addMoney(budgetId: number, amount: number) {
    return this.api.post<Budget>(`budgets/${budgetId}/add-money`, { amount });
  }
}
