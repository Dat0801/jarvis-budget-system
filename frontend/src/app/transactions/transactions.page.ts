import { Component, OnInit } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { BudgetService, Budget } from '../services/budget.service';
import { ExpenseService } from '../services/expense.service';
import { IncomeService } from '../services/income.service';
import { MonthlyReport, StatsService } from '../services/stats.service';
import { FabService } from '../services/fab.service';
import { Router } from '@angular/router';
import { formatCurrencyAmount, getStoredCurrencyCode } from '../utils/currency.util';

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

interface MonthTab {
  key: string;
  label: string;
  year: number;
  month: number;
}

@Component({
  selector: 'app-transactions',
  templateUrl: 'transactions.page.html',
  styleUrls: ['transactions.page.scss'],
  standalone: false,
})
export class TransactionsPage implements OnInit {
  private readonly fabOwner = 'transactions-page';
  jars: Budget[] = [];
  groupedTransactions: TransactionGroup[] = [];
  allTransactions: TransactionItem[] = [];
  monthTabs: MonthTab[] = [];
  selectedMonthKey = '';
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
    private statsService: StatsService,
    private fabService: FabService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadTransactions();
  }

  ionViewWillEnter(): void {
    this.fabService.showFab(() => this.router.navigateByUrl('/expense'), 'add', this.fabOwner);
    this.loadTransactions();
  }

  ionViewDidLeave(): void {
    this.fabService.hideFab(this.fabOwner);
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
            subtitle: `${item.category || jarById[Number(item.jar_id)] || 'Expense'} • ${this.formatDate(
              date
            )} • ${this.formatTime(date)}`,
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

        this.allTransactions = allTransactions;
        this.calculateMonthlySummary(allTransactions);
        this.buildMonthTabs();
        if (this.monthTabs.length > 0) {
          if (!this.selectedMonthKey) {
            const now = new Date();
            this.selectedMonthKey = this.getMonthKey(now);
          }
          this.applySelectedMonth();
        } else {
          this.groupedTransactions = [];
        }
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load transactions';
        this.isLoading = false;
      },
    });
  }

  onMonthChange(event: CustomEvent): void {
    const nextMonthKey = (event.detail?.value || '').toString();
    this.selectedMonthKey = nextMonthKey;
    this.applySelectedMonth();
  }

  trackByMonth(_index: number, tab: MonthTab): string {
    return tab.key;
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
    return formatCurrencyAmount(value, getStoredCurrencyCode());
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

  private buildMonthTabs(): void {
    this.monthTabs = [];

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const monthsBack = 24;
    const firstMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - (monthsBack - 1), 1);

    const tabs: MonthTab[] = [];
    let cursor = new Date(firstMonth.getFullYear(), firstMonth.getMonth(), 1);

    while (cursor.getTime() <= thisMonth.getTime()) {
      const isThisMonth =
        cursor.getFullYear() === thisMonth.getFullYear() &&
        cursor.getMonth() === thisMonth.getMonth();
      const isLastMonth =
        cursor.getFullYear() === lastMonth.getFullYear() &&
        cursor.getMonth() === lastMonth.getMonth();

      const label = isThisMonth
        ? 'This month'
        : isLastMonth
          ? 'Last month'
          : this.formatOlderMonthLabel(cursor);

      tabs.push({
        key: this.getMonthKey(cursor),
        label,
        year: cursor.getFullYear(),
        month: cursor.getMonth(),
      });

      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    this.monthTabs = tabs;
  }

  private applySelectedMonth(): void {
    const activeTab = this.monthTabs.find((tab) => tab.key === this.selectedMonthKey);
    if (!activeTab) {
      this.groupedTransactions = [];
      this.inflowTotal = 0;
      this.outflowTotal = 0;
      this.totalBalance = 0;
      return;
    }

    const selectedTransactions = this.allTransactions.filter((transaction) => {
      const transactionDate = transaction.date;
      return (
        transactionDate.getFullYear() === activeTab.year &&
        transactionDate.getMonth() === activeTab.month
      );
    });

    let monthInflow = 0;
    let monthOutflow = 0;

    selectedTransactions.forEach((transaction) => {
      if (transaction.type === 'income') {
        monthInflow += transaction.amount;
      } else {
        monthOutflow += transaction.amount;
      }
    });

    this.inflowTotal = monthInflow;
    this.outflowTotal = monthOutflow;
    this.totalBalance = monthInflow - monthOutflow;

    this.groupedTransactions = this.groupByDate(selectedTransactions);
  }

  private getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private formatOlderMonthLabel(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
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

  private extractList<T>(response: any): T[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response.data)) {
      return response.data;
    }

    return [];
  }

  private parseDate(value: string | Date | null | undefined): Date {
    if (!value) {
      return new Date();
    }
    if (value instanceof Date) {
      return value;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    return parsed;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  private getExpenseIcon(item: ExpenseItem): string {
    const category = (item.category || '').toLowerCase();
    if (category.includes('food') || category.includes('drink') || category.includes('coffee')) {
      return 'fast-food-outline';
    }
    if (category.includes('travel') || category.includes('taxi') || category.includes('flight')) {
      return 'airplane-outline';
    }
    if (category.includes('rent') || category.includes('home')) {
      return 'home-outline';
    }
    if (category.includes('shopping') || category.includes('market')) {
      return 'cart-outline';
    }
    if (category.includes('health') || category.includes('hospital')) {
      return 'medkit-outline';
    }
    if (category.includes('education') || category.includes('school')) {
      return 'school-outline';
    }
    return 'card-outline';
  }
}
