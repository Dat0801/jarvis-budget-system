import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface BudgetExpense {
  budget_id: string;
  budget_name: string;
  budget_color: string;
  amount: number;
  percentage: number;
}

export interface SpendingAnalytics {
  month: string;
  total_spent: number;
  expenses_by_budget: BudgetExpense[];
}

export interface IncomeVsExpenses {
  months: string[];
  income: number[];
  expenses: number[];
}

export interface Summary {
  month: string;
  total_income: number;
  total_expenses: number;
  balance: number;
}

export interface MonthlyReport {
  id: number;
  month: string;
  total_income: string;
  total_expenses: string;
  generated_at: string | null;
}

export interface PaginatedMonthlyReports {
  data: MonthlyReport[];
  current_page: number;
  last_page: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  constructor(private api: ApiService) {}

  getSpendingAnalytics(month?: string): Observable<SpendingAnalytics> {
    let path = '/stats/spending';
    if (month) {
      path = `${path}?month=${month}`;
    }
    return this.api.get<SpendingAnalytics>(path);
  }

  getIncomeVsExpenses(): Observable<IncomeVsExpenses> {
    return this.api.get<IncomeVsExpenses>('/stats/income-vs-expenses');
  }

  getSummary(): Observable<Summary> {
    return this.api.get<Summary>('/stats/summary');
  }

  getMonthlyReports(): Observable<PaginatedMonthlyReports> {
    return this.api.get<PaginatedMonthlyReports>('/reports/monthly');
  }
}
