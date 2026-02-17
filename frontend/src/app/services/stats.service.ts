import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface JarExpense {
  jar_id: string;
  jar_name: string;
  jar_color: string;
  amount: number;
  percentage: number;
}

export interface SpendingAnalytics {
  month: string;
  total_spent: number;
  expenses_by_jar: JarExpense[];
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
}
