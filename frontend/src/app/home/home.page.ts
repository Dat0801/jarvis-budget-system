import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { Wallet, WalletService } from '../services/wallet.service';
import { ExpenseService } from '../services/expense.service';
import { IncomeService } from '../services/income.service';
import { NoteService } from '../services/note.service';
import { IncomeVsExpenses, StatsService } from '../services/stats.service';
import { CategoryService, CategoryTreeNode } from '../services/category.service';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import {
  CurrencyCode,
  formatCurrencyAmount,
  getStoredCurrencyCode,
} from '../utils/currency.util';

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
  percentage: number;
}

interface ChartAxisTick {
  y: number;
  value: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, PageHeaderComponent],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
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

  weeklyTopSpending: TopSpending[] = [
    { title: 'No spending this week', amount: 0, percentage: 0 },
  ];
  monthlyTopSpending: TopSpending[] = [
    { title: 'No spending this month', amount: 0, percentage: 0 },
  ];
  selectedSpendingTab: 'week' | 'month' = 'week';

  expenseCategories: CategoryTreeNode[] = [];
  private categoryParentMap: Record<string, string> = {};

  reportLabels: string[] = [];
  reportPath = '';
  reportPoints = '';
  reportAxisTicks: ChartAxisTick[] = [];
  reportMaxValue = 1;
  reportMetricTab: 'income' | 'expense' = 'expense';
  reportRangeTab: 'week' | 'month' = 'month';
  reportActiveIndex: number | null = null;

  private monthlyLabels: string[] = [];
  private monthlyIncomeSeries: number[] = [];
  private monthlyExpenseSeries: number[] = [];
  private weeklyLabels: string[] = [];
  private weeklyIncomeSeries: number[] = [];
  private weeklyExpenseSeries: number[] = [];

  constructor(
    private router: Router,
    private walletService: WalletService,
    private expenseService: ExpenseService,
    private incomeService: IncomeService,
    private noteService: NoteService,
    private statsService: StatsService,
    private categoryService: CategoryService
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

  selectReportMetricTab(tab: 'income' | 'expense'): void {
    this.reportMetricTab = tab;
    this.updateReportChart();
  }

  selectReportRangeTab(tab: 'week' | 'month'): void {
    this.reportRangeTab = tab;
    this.reportActiveIndex = null;
    this.updateReportChart();
  }

  selectReportPoint(index: number): void {
    if (index < 0 || index >= this.reportLabels.length) {
      this.reportActiveIndex = null;
      return;
    }
    this.reportActiveIndex = index;
  }

  get reportTotal(): number {
    if (this.reportMetricTab === 'income') {
      return this.monthlyIncomeTotal;
    }
    return this.monthlyExpenseTotal;
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

  openWalletDetail(): void {
    this.router.navigate(['/tabs/transactions']);
  }

  openTransactionDetail(transaction: Transaction): void {
    const type = transaction.type;
    const id = transaction.id;
    if ((type !== 'income' && type !== 'expense') || !Number.isFinite(id)) {
      return;
    }
    this.router.navigate(['/tabs/transactions', type, id]);
  }

  private loadDashboardData(): void {
    this.isLoadingDashboard = true;
    forkJoin({
      jars: this.walletService.list().pipe(catchError(() => of([]))),
      expensesResponse: this.expenseService.list().pipe(catchError(() => of([]))),
      incomesResponse: this.incomeService.list().pipe(catchError(() => of([]))),
      reminders: this.noteService.reminderCount().pipe(catchError(() => of({ count: 0 }))),
      incomeVsExpenses: this.statsService.getIncomeVsExpenses().pipe(catchError(() => of(null))),
      expenseCategories: this.categoryService
        .getTree('expense')
        .pipe(catchError(() => of({ data: [] } as { data: CategoryTreeNode[] }))),
    })
      .pipe(
        finalize(() => {
          this.isLoadingDashboard = false;
        })
      )
      .subscribe(({ jars, expensesResponse, incomesResponse, reminders, incomeVsExpenses, expenseCategories }) => {
        this.notificationCount = Number(reminders?.count) || 0;
        this.jars = Array.isArray(jars) ? jars : [];

        const categoriesData = Array.isArray(expenseCategories?.data)
          ? expenseCategories.data
          : [];
        this.expenseCategories = categoriesData;
        this.categoryParentMap = this.buildCategoryParentMap(categoriesData);

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
        this.buildWeeklyReportSeries();
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

    this.monthlyTransactionTotal = currentMonthTransactions.reduce(
      (sum, transaction) => sum + Math.abs(transaction.amount),
      0
    );
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

    this.weeklyTopSpending = this.getTopSpendingList(weekExpenses, 'No spending this week');
    this.monthlyTopSpending = this.getTopSpendingList(monthExpenses, 'No spending this month');
  }

  private getTopSpendingList(expenses: Transaction[], emptyLabel: string): TopSpending[] {
    if (!expenses.length) {
      return [
        {
          title: emptyLabel,
          amount: 0,
          percentage: 0,
        },
      ];
    }

    const groupedAmounts = expenses.reduce<Record<string, number>>((accumulator, transaction) => {
      const key = this.getParentCategoryTitle(transaction.title);
      accumulator[key] = (accumulator[key] || 0) + Math.abs(transaction.amount);
      return accumulator;
    }, {});

    const totalAmount = Object.values(groupedAmounts).reduce(
      (sum, value) => sum + value,
      0
    );

    if (!totalAmount) {
      return [
        {
          title: emptyLabel,
          amount: 0,
          percentage: 0,
        },
      ];
    }

    return Object.entries(groupedAmounts)
      .sort((first, second) => second[1] - first[1])
      .map(([title, amount]) => ({
        title,
        amount,
        percentage: (amount / totalAmount) * 100,
      }));
  }

  private buildCategoryParentMap(tree: CategoryTreeNode[]): Record<string, string> {
    const map: Record<string, string> = {};

    tree.forEach((parent) => {
      const parentName = parent.name?.trim();
      if (parentName) {
        const parentKey = parentName.toLowerCase();
        map[parentKey] = parentName;
      }

      parent.children.forEach((child) => {
        const childName = child.name?.trim();
        if (!childName) {
          return;
        }
        const childKey = childName.toLowerCase();
        map[childKey] = parentName || childName;
      });
    });

    return map;
  }

  private getParentCategoryTitle(rawTitle: string | null | undefined): string {
    const fallback = rawTitle && rawTitle.trim().length > 0 ? rawTitle.trim() : 'Other';
    const normalized = fallback.toLowerCase();

    const parent = this.categoryParentMap[normalized];
    if (parent && parent.trim().length > 0) {
      return parent;
    }

    return fallback;
  }

  private buildIncomeExpenseChart(data: IncomeVsExpenses | null): void {
    const fallbackLabel = this.monthLabel || this.getCurrentMonthLabel();
    const labels = Array.isArray(data?.months) ? data?.months.slice(-6) : [fallbackLabel];
    const income = Array.isArray(data?.income) ? data?.income.slice(-6) : [this.monthlyIncomeTotal];
    const expenses = Array.isArray(data?.expenses)
      ? data?.expenses.slice(-6)
      : [this.monthlyExpenseTotal];

    this.monthlyLabels = labels;

    const normalizedIncome = this.normalizeSeriesLength(income, this.monthlyLabels.length);
    const normalizedExpenses = this.normalizeSeriesLength(expenses, this.monthlyLabels.length);

    this.monthlyIncomeSeries = normalizedIncome;
    this.monthlyExpenseSeries = normalizedExpenses;

    this.updateReportChart();
  }

  private buildWeeklyReportSeries(): void {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const weekStarts: Date[] = [];
    let cursor = new Date(firstDayOfMonth.getTime());

    while (cursor.getTime() <= lastDayOfMonth.getTime()) {
      weekStarts.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
      cursor.setDate(cursor.getDate() + 7);
    }

    const labels: string[] = [];
    const incomeSeries: number[] = [];
    const expenseSeries: number[] = [];

    for (let index = 0; index < weekStarts.length; index += 1) {
      const start = weekStarts[index];
      const end =
        index === weekStarts.length - 1
          ? new Date(lastDayOfMonth.getFullYear(), lastDayOfMonth.getMonth(), lastDayOfMonth.getDate(), 23, 59, 59, 999)
          : new Date(
              weekStarts[index + 1].getFullYear(),
              weekStarts[index + 1].getMonth(),
              weekStarts[index + 1].getDate() - 1,
              23,
              59,
              59,
              999
            );

      labels.push(`W${index + 1}`);

      const weekTransactions = this.allTransactions.filter((transaction) => {
        const transactionDate = transaction.date;
        return (
          transactionDate.getFullYear() === currentYear &&
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getTime() >= start.getTime() &&
          transactionDate.getTime() <= end.getTime()
        );
      });

      const weekIncome = weekTransactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

      const weekExpense = weekTransactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

      incomeSeries.push(weekIncome);
      expenseSeries.push(weekExpense);
    }

    this.weeklyLabels = labels;
    this.weeklyIncomeSeries = incomeSeries;
    this.weeklyExpenseSeries = expenseSeries;
  }

  private updateReportChart(): void {
    let labels: string[] = [];
    let values: number[] = [];

    if (this.reportRangeTab === 'week') {
      labels = this.weeklyLabels;
      values = this.reportMetricTab === 'income' ? this.weeklyIncomeSeries : this.weeklyExpenseSeries;
    } else {
      labels = this.monthlyLabels;
      values = this.reportMetricTab === 'income' ? this.monthlyIncomeSeries : this.monthlyExpenseSeries;
    }

    if (!labels.length) {
      const fallbackLabel = this.monthLabel || this.getCurrentMonthLabel();
      labels = [fallbackLabel];
      values = [
        this.reportMetricTab === 'income' ? this.monthlyIncomeTotal : this.monthlyExpenseTotal,
      ];
    }

    this.reportLabels = labels;
    if (this.reportActiveIndex !== null && this.reportActiveIndex >= this.reportLabels.length) {
      this.reportActiveIndex = this.reportLabels.length - 1;
    }

    const normalizedValues = this.normalizeSeriesLength(values, this.reportLabels.length);

    this.reportMaxValue = Math.max(...normalizedValues, 1);

    this.reportPath = this.buildChartPath(normalizedValues);
    this.reportPoints = this.buildChartPoints(normalizedValues);

    const maxValue = this.reportMaxValue;
    const midValue = maxValue / 2;
    this.reportAxisTicks = [
      { y: 24, value: maxValue },
      { y: 84, value: midValue },
      { y: 144, value: 0 },
    ];
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

  getReportHitAreaX(index: number): number {
    const xPadding = 16;
    const width = 300;
    const innerWidth = width - xPadding * 2;
    const denominator = Math.max(this.reportLabels.length - 1, 1);
    const centerX = xPadding + (index / denominator) * innerWidth;
    return centerX - 12;
  }

  formatAxisValue(value: number): string {
    const absolute = Math.abs(value);

    if (absolute >= 1_000_000_000) {
      const scaled = value / 1_000_000_000;
      return `${scaled.toFixed(Math.abs(scaled) >= 100 ? 0 : 1)}B`;
    }

    if (absolute >= 1_000_000) {
      const scaled = value / 1_000_000;
      return `${scaled.toFixed(Math.abs(scaled) >= 100 ? 0 : 1)}M`;
    }

    if (absolute >= 1_000) {
      const scaled = value / 1_000;
      return `${scaled.toFixed(Math.abs(scaled) >= 100 ? 0 : 1)}K`;
    }

    return Math.round(value).toString();
  }

  getActiveReportLabel(): string | null {
    if (this.reportActiveIndex === null) {
      return null;
    }
    if (this.reportActiveIndex < 0 || this.reportActiveIndex >= this.reportLabels.length) {
      return null;
    }
    return this.reportLabels[this.reportActiveIndex];
  }

  getActiveReportValue(): number | null {
    if (this.reportActiveIndex === null) {
      return null;
    }

    if (this.reportRangeTab === 'week') {
      const series =
        this.reportMetricTab === 'income' ? this.weeklyIncomeSeries : this.weeklyExpenseSeries;
      if (this.reportActiveIndex < 0 || this.reportActiveIndex >= series.length) {
        return null;
      }
      return series[this.reportActiveIndex];
    }

    const series =
      this.reportMetricTab === 'income' ? this.monthlyIncomeSeries : this.monthlyExpenseSeries;
    if (this.reportActiveIndex < 0 || this.reportActiveIndex >= series.length) {
      return null;
    }
    return series[this.reportActiveIndex];
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
