import { Component, OnInit } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { BudgetService, Budget } from '../services/budget.service';
import { ExpenseService } from '../services/expense.service';
import { IncomeService } from '../services/income.service';
import { MonthlyReport, StatsService } from '../services/stats.service';

interface ExpenseItem {
  id: number;
  jar_id?: number | null;
  amount: number | string;
  category?: string;
  note?: string;
  spent_at?: string;
  created_at?: string;
}

interface IncomeItem {
  id: number;
  jar_id?: number | null;
  amount: number | string;
  source?: string;
  received_at?: string;
  created_at?: string;
}

interface TransactionItem {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  type: 'income' | 'expense';
  icon: string;
  date: Date;
  timeLabel: string;
}

interface TransactionGroup {
  label: string;
  items: TransactionItem[];
}

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit {
  jars: Budget[] = [];
  groupedTransactions: TransactionGroup[] = [];
  monthlyReports: MonthlyReport[] = [];
  isReportsModalOpen = false;

  isLoading = true;
  error: string | null = null;

  totalBalance = 0;
  inflowTotal = 0;
  outflowTotal = 0;
  monthDeltaPercent = 0;

  constructor(
    private budgetService: BudgetService,
    private expenseService: ExpenseService,
    private incomeService: IncomeService,
    private statsService: StatsService
  ) {}

  ngOnInit() {
    this.loadTransactions();
  }

  ionViewWillEnter(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.isLoading = true;
    this.error = null;

    forkJoin({
      jars: this.budgetService.list().pipe(catchError(() => of([]))),
      expensesResponse: this.expenseService.list().pipe(catchError(() => of([]))),
      incomesResponse: this.incomeService.list().pipe(catchError(() => of([]))),
      reportsResponse: this.statsService.getMonthlyReports().pipe(catchError(() => of({ data: [] }))),
    }).subscribe({
      next: ({ jars, expensesResponse, incomesResponse, reportsResponse }) => {
        this.jars = Array.isArray(jars) ? jars : [];
        this.monthlyReports = Array.isArray(reportsResponse?.data) ? reportsResponse.data : [];

        const jarById = this.jars.reduce<Record<number, string>>((accumulator, jar) => {
          accumulator[jar.id] = jar.name;
          return accumulator;
        }, {});

        const expenses = this.extractList<ExpenseItem>(expensesResponse).map((item) => {
          const date = this.parseDate(item.spent_at || item.created_at);
          return {
            id: `expense-${item.id}`,
            title: item.note || item.category || 'Expense',
            subtitle: `${item.category || jarById[Number(item.jar_id)] || 'Expense'} • ${this.formatDate(date)} • ${this.formatTime(date)}`,
            amount: Math.abs(Number(item.amount) || 0),
            type: 'expense' as const,
            icon: this.getExpenseIcon(item),
            date,
            timeLabel: this.formatTime(date),
          };
        });

        const incomes = this.extractList<IncomeItem>(incomesResponse).map((item) => {
          const date = this.parseDate(item.received_at || item.created_at);
          return {
            id: `income-${item.id}`,
            title: item.source || 'Income',
            subtitle: `Income • ${this.formatDate(date)} • ${this.formatTime(date)}`,
            amount: Math.abs(Number(item.amount) || 0),
            type: 'income' as const,
            icon: 'cash-outline',
            date,
            timeLabel: this.formatTime(date),
          };
        });

        const allTransactions = [...expenses, ...incomes].sort(
          (first, second) => second.date.getTime() - first.date.getTime()
        );

        this.calculateMonthlySummary(allTransactions);
        this.groupedTransactions = this.groupByDate(allTransactions);
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load transactions';
        this.isLoading = false;
      },
    });
  }

  trackByGroup(_index: number, group: TransactionGroup): string {
    return group.label;
  }

  trackByTransaction(_index: number, transaction: TransactionItem): string {
    return transaction.id;
  }

  openReportsModal(): void {
    this.isReportsModalOpen = true;
  }

  closeReportsModal(): void {
    this.isReportsModalOpen = false;
  }

  getAmountPrefix(type: 'income' | 'expense'): string {
    return type === 'income' ? '+' : '-';
  }

  formatCurrency(value: number): string {
    const formatted = new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

    return `${formatted} đ`;
  }

  formatSignedCurrency(value: number): string {
    const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${prefix}${this.formatCurrency(Math.abs(value))}`;
  }

  formatReportMonth(value: string): string {
    const date = new Date(`${value}-01`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  private calculateMonthlySummary(transactions: TransactionItem[]): void {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const previousMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const previousMonth = previousMonthDate.getMonth();
    const previousYear = previousMonthDate.getFullYear();

    let currentInflow = 0;
    let currentOutflow = 0;
    let previousNet = 0;

    transactions.forEach((transaction) => {
      const txMonth = transaction.date.getMonth();
      const txYear = transaction.date.getFullYear();

      if (txMonth === currentMonth && txYear === currentYear) {
        if (transaction.type === 'income') {
          currentInflow += transaction.amount;
        } else {
          currentOutflow += transaction.amount;
        }
      }

      if (txMonth === previousMonth && txYear === previousYear) {
        previousNet += transaction.type === 'income' ? transaction.amount : -transaction.amount;
      }
    });

    this.inflowTotal = currentInflow;
    this.outflowTotal = currentOutflow;
    this.totalBalance = currentInflow - currentOutflow;

    if (previousNet === 0) {
      this.monthDeltaPercent = this.totalBalance > 0 ? 100 : 0;
      return;
    }

    const delta = ((this.totalBalance - previousNet) / Math.abs(previousNet)) * 100;
    this.monthDeltaPercent = Number(delta.toFixed(1));
  }

  private groupByDate(transactions: TransactionItem[]): TransactionGroup[] {
    const groups = transactions.reduce<Record<string, TransactionItem[]>>((accumulator, transaction) => {
      const key = this.formatGroupLabel(transaction.date);
      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      accumulator[key].push(transaction);
      return accumulator;
    }, {});

    return Object.entries(groups).map(([label, items]) => ({ label, items }));
  }

  private formatGroupLabel(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'TODAY';
    }

    if (date.toDateString() === yesterday.toDateString()) {
      return 'YESTERDAY';
    }

    return date
      .toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      .toUpperCase();
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private getExpenseIcon(item: ExpenseItem): string {
    const text = `${item.category || ''} ${item.note || ''}`.toLowerCase();

    if (text.includes('grocery') || text.includes('food') || text.includes('market')) {
      return 'cart-outline';
    }
    if (text.includes('transport') || text.includes('uber') || text.includes('car')) {
      return 'car-outline';
    }
    if (text.includes('dining') || text.includes('coffee') || text.includes('restaurant')) {
      return 'restaurant-outline';
    }
    if (text.includes('health') || text.includes('gym') || text.includes('fitness')) {
      return 'barbell-outline';
    }
    if (text.includes('housing') || text.includes('rent') || text.includes('home')) {
      return 'home-outline';
    }

    return 'wallet-outline';
  }

  private extractList<T>(response: unknown): T[] {
    if (Array.isArray(response)) {
      return response as T[];
    }

    if (
      typeof response === 'object' &&
      response !== null &&
      'data' in response &&
      Array.isArray((response as { data?: unknown }).data)
    ) {
      return (response as { data: T[] }).data;
    }

    return [];
  }

  private parseDate(value: string | undefined): Date {
    if (!value) {
      return new Date();
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }

    return parsed;
  }
}
