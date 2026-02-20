import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { Wallet, WalletService } from '../../services/wallet.service';
import { ExpenseService } from '../../services/expense.service';
import { IncomeService } from '../../services/income.service';
import { NoteService } from '../../services/note.service';
import { IncomeVsExpenses, StatsService } from '../../services/stats.service';
import {
  CurrencyCode,
  formatCurrencyAmount,
  getStoredCurrencyCode,
} from '../../utils/currency.util';

interface Transaction {
  id: number;
  jarId: number | null;
  jarName: string;
  title: string;
  note: string;
  timeLabel: string;
  date: Date;
  amount: number;
  type: 'income' | 'expense';
  icon: string;
}

interface TopSpending {
  title: string;
  amount: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  jars: Wallet[] = [];
  totalWalletBalance = 0;
  selectedCurrencyCode: CurrencyCode = 'VND';
  allTransactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  searchTerm = '';
  notificationCount = 0;
  isLoadingDashboard = false;

  monthLabel = '';
  totalTransaction = 0;
  monthlyTransactionTotal = 0;
  monthlyIncomeTotal = 0;
  monthlyExpenseTotal = 0;

  weeklyTopSpending: TopSpending = { title: 'No spending this week', amount: 0 };
  monthlyTopSpending: TopSpending = { title: 'No spending this month', amount: 0 };
  selectedSpendingTab: 'week' | 'month' = 'week';

  reportLabels: string[] = [];
  incomePath = '';
  expensePath = '';
  incomePoints = '';
  expensePoints = '';
  reportMaxValue = 1;

  constructor(
    private router: Router,
    private walletService: WalletService,
    private expenseService: ExpenseService,
    private incomeService: IncomeService,
    private noteService: NoteService,
    private statsService: StatsService
  ) {}

  ngOnInit(): void {
    this.loadCurrencyPreference();
    this.monthLabel = this.getCurrentMonthLabel();
    this.loadDashboardData();
  }

  ionViewWillEnter(): void {
    this.loadCurrencyPreference();
    this.loadDashboardData();
  }

  onSearchChange(event: CustomEvent): void {
    this.searchTerm = (event.detail.value || '').toString();
    this.applyTransactionSearch();
  }

  openNotifications(): void {
    this.router.navigateByUrl('/tabs/notes');
  }

  selectSpendingTab(tab: 'week' | 'month'): void {
    this.selectedSpendingTab = tab;
  }

  getWalletProgress(jar: Wallet): number {
    const balance = Number(jar.balance);
    const total = Math.abs(this.totalWalletBalance);
    if (!total || Number.isNaN(balance)) {
      return 0;
    }
    return Math.min(100, Math.max(0, (Math.abs(balance) / total) * 100));
  }

  trackByTransactionId(_index: number, transaction: Transaction): number {
    return transaction.id;
  }

  trackByWalletId(_index: number, jar: Wallet): number {
    return jar.id;
  }

  openWallets(): void {
    this.router.navigate(['/tabs/wallets']);
  }

  openWalletDetail(jarId: number): void {
    this.router.navigate(['/tabs/budgets', jarId, 'activity']);
  }

  private loadDashboardData(): void {
    this.isLoadingDashboard = true;
    forkJoin({
      jars: this.walletService.list().pipe(catchError(() => of([]))),
      expensesResponse: this.expenseService.list().pipe(catchError(() => of([]))),
      incomesResponse: this.incomeService.list().pipe(catchError(() => of([]))),
      reminders: this.noteService.reminderCount().pipe(catchError(() => of({ count: 0 }))),
      incomeVsExpenses: this.statsService.getIncomeVsExpenses().pipe(catchError(() => of(null))),
    }).pipe(finalize(() => {
      this.isLoadingDashboard = false;
    })).subscribe(({ jars, expensesResponse, incomesResponse, reminders, incomeVsExpenses }) => {
      this.notificationCount = Number(reminders?.count) || 0;
      this.jars = Array.isArray(jars) ? jars : [];

      const expenses = this.extractList(expensesResponse).map((expense: any) => {
        const transactionDate = this.parseDate(expense.spent_at || expense.created_at);
        return {
          id: Number(expense.id),
          jarId: expense.jar_id ?? null,
          jarName: expense?.jar?.name || 'Wallet',
          title: expense.category || 'Expense',
          note: expense.note || '',
          timeLabel: this.formatDateLabel(transactionDate),
          date: transactionDate,
          amount: -Math.abs(Number(expense.amount) || 0),
          type: 'expense' as const,
          icon: 'arrow-up-outline',
        };
      });

      const incomes = this.extractList(incomesResponse).map((income: any) => {
        const transactionDate = this.parseDate(income.received_at || income.created_at);
        return {
          id: Number(income.id),
          jarId: income.jar_id ?? null,
          jarName: income?.jar?.name || 'Wallet',
          title: income.source || 'Income',
          note: '',
          timeLabel: this.formatDateLabel(transactionDate),
          date: transactionDate,
          amount: Math.abs(Number(income.amount) || 0),
          type: 'income' as const,
          icon: 'arrow-down-outline',
        };
      });

      this.allTransactions = [...expenses, ...incomes].sort(
        (first, second) => second.date.getTime() - first.date.getTime()
      );

      this.totalWalletBalance = this.jars.reduce(
        (sum, jar) => sum + this.parseAmount(jar.balance),
        0
      );

      this.calculateMonthlyTotals();
      this.calculateTopSpending(expenses);
      this.buildIncomeExpenseChart(incomeVsExpenses);
      this.applyTransactionSearch();
    });
  }

  private calculateMonthlyTotals(): void {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const currentMonthTransactions = this.allTransactions.filter((transaction) => {
      const txDate = transaction.date;
      return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
    });

    this.totalTransaction = currentMonthTransactions.length;

    this.monthlyIncomeTotal = currentMonthTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

    this.monthlyExpenseTotal = currentMonthTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

    this.monthlyTransactionTotal = currentMonthTransactions
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

  }

  private calculateTopSpending(expenses: Transaction[]): void {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - 6);

    const monthExpenses = expenses.filter((transaction) => {
      const transactionDate = transaction.date;
      return (
        transactionDate.getFullYear() === now.getFullYear() &&
        transactionDate.getMonth() === now.getMonth()
      );
    });

    const weekExpenses = expenses.filter((transaction) => transaction.date >= weekStart);

    this.weeklyTopSpending = this.getTopSpending(weekExpenses, 'No spending this week');
    this.monthlyTopSpending = this.getTopSpending(monthExpenses, 'No spending this month');
  }

  private getTopSpending(expenses: Transaction[], emptyLabel: string): TopSpending {
    if (!expenses.length) {
      return { title: emptyLabel, amount: 0 };
    }

    const groupedAmounts = expenses.reduce<Record<string, number>>((accumulator, transaction) => {
      const key = transaction.title || 'Other';
      accumulator[key] = (accumulator[key] || 0) + Math.abs(transaction.amount);
      return accumulator;
    }, {});

    const [title, amount] = Object.entries(groupedAmounts).sort(
      (first, second) => second[1] - first[1]
    )[0];

    return { title, amount };
  }

  private buildIncomeExpenseChart(data: IncomeVsExpenses | null): void {
    const fallbackLabel = this.monthLabel || this.getCurrentMonthLabel();
    const labels = Array.isArray(data?.months) ? data?.months.slice(-6) : [fallbackLabel];
    const income = Array.isArray(data?.income) ? data?.income.slice(-6) : [this.monthlyIncomeTotal];
    const expenses = Array.isArray(data?.expenses)
      ? data?.expenses.slice(-6)
      : [this.monthlyExpenseTotal];

    this.reportLabels = labels.length ? labels : [fallbackLabel];
    const normalizedIncome = this.normalizeSeriesLength(income, this.reportLabels.length);
    const normalizedExpenses = this.normalizeSeriesLength(expenses, this.reportLabels.length);

    this.reportMaxValue = Math.max(...normalizedIncome, ...normalizedExpenses, 1);

    this.incomePath = this.buildChartPath(normalizedIncome);
    this.expensePath = this.buildChartPath(normalizedExpenses);
    this.incomePoints = this.buildChartPoints(normalizedIncome);
    this.expensePoints = this.buildChartPoints(normalizedExpenses);
  }

  private normalizeSeriesLength(values: number[], expectedLength: number): number[] {
    if (!values.length) {
      return new Array(expectedLength).fill(0);
    }

    if (values.length === expectedLength) {
      return values;
    }

    if (values.length > expectedLength) {
      return values.slice(values.length - expectedLength);
    }

    const padding = new Array(expectedLength - values.length).fill(values[0] || 0);
    return [...padding, ...values];
  }

  private buildChartPath(values: number[]): string {
    const points = this.getChartCoordinates(values);
    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
  }

  private buildChartPoints(values: number[]): string {
    const points = this.getChartCoordinates(values);
    return points.map((point) => `${point.x},${point.y}`).join(' ');
  }

  private getChartCoordinates(values: number[]): { x: number; y: number }[] {
    const width = 300;
    const height = 160;
    const xPadding = 16;
    const yPadding = 14;
    const drawableWidth = width - xPadding * 2;
    const drawableHeight = height - yPadding * 2;
    const denominator = Math.max(values.length - 1, 1);

    return values.map((value, index) => {
      const x = xPadding + (index / denominator) * drawableWidth;
      const y = yPadding + (1 - value / this.reportMaxValue) * drawableHeight;
      return {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
      };
    });
  }

  private applyTransactionSearch(): void {
    const keyword = this.searchTerm.trim().toLowerCase();

    if (!keyword) {
      this.filteredTransactions = this.allTransactions.slice(0, 8);
      return;
    }

    this.filteredTransactions = this.allTransactions
      .filter((transaction) => {
        const haystack = [
          transaction.title,
          transaction.note,
          transaction.jarName,
          transaction.timeLabel,
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(keyword);
      })
      .slice(0, 12);
  }

  private getCurrentMonthLabel(): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }

  private extractList(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }
    return Array.isArray(response?.data) ? response.data : [];
  }

  private parseDate(value: string | null | undefined): Date {
    if (!value) {
      return new Date();
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }

    return parsed;
  }

  private parseAmount(value: string | number | null | undefined): number {
    const raw = value?.toString() || '0';
    const normalized = raw.replace(/[^0-9.-]+/g, '');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  formatCurrency(value: string | number | null | undefined): string {
    return formatCurrencyAmount(this.parseAmount(value), this.selectedCurrencyCode);
  }

  private loadCurrencyPreference(): void {
    this.selectedCurrencyCode = getStoredCurrencyCode();
  }

  private formatDateLabel(transactionDate: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (transactionDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (transactionDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return transactionDate.toLocaleDateString();
  }
}
