import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController } from '@ionic/angular';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { Wallet, WalletService } from '../../services/wallet.service';
import { ExpenseService } from '../../services/expense.service';
import { IncomeService } from '../../services/income.service';
import { StatsService, IncomeVsExpenses } from '../../services/stats.service';
import { CategoryService, CategoryTreeNode } from '../../services/category.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
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

interface ChartAxisTick {
  y: number;
  value: number;
}

@Component({
  selector: 'app-report-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, PageHeaderComponent],
  templateUrl: './report-detail.page.html',
  styleUrls: ['./report-detail.page.scss'],
})
export class ReportDetailPage implements OnInit {
  isLoadingDashboard = false;
  selectedCurrencyCode: CurrencyCode = 'VND';
  allTransactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  monthLabel = '';
  selectedMonth = ''; // YYYY-MM
  isCalendarOpen = false;
  monthlyIncomeTotal = 0;
  monthlyExpenseTotal = 0;

  categoryBreakdown: { title: string; amount: number; percentage: number }[] = [];
  jarBreakdown: { title: string; amount: number; percentage: number; color: string }[] = [];
  breakdownType: 'category' | 'jar' = 'category';

  summaryStats = {
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    avgPerDay: 0,
    transactionCount: 0
  };

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
  private categoryParentMap: Record<string, string> = {};
  private categoryIconMap: Record<string, string> = {};

  constructor(
    private walletService: WalletService,
    private expenseService: ExpenseService,
    private incomeService: IncomeService,
    private statsService: StatsService,
    private categoryService: CategoryService,
    private navCtrl: NavController,
    private router: Router
  ) {}

  @HostListener('window:keydown.esc', ['$event'])
  handleEscape(event: KeyboardEvent) {
    this.goBack();
  }

  ngOnInit(): void {
    this.loadCurrencyPreference();
    this.selectedMonth = this.getCurrentMonthValue();
    this.monthLabel = this.formatMonthLabel(this.selectedMonth);
    this.loadReportData();
  }

  ionViewWillEnter(): void {
    this.loadCurrencyPreference();
    this.loadReportData();
  }

  goBack(): void {
    this.navCtrl.navigateBack('/tabs/dashboard');
  }

  onMonthChange(event: any): void {
    const value = event.detail.value;
    if (value) {
      this.selectedMonth = value.substring(0, 7); // Ensure YYYY-MM
      this.monthLabel = this.formatMonthLabel(this.selectedMonth);
      this.isCalendarOpen = false;
      this.loadReportData();
    }
  }

  openCalendar(): void {
    this.isCalendarOpen = true;
  }

  prevMonth(): void {
    const date = new Date(this.selectedMonth + '-01');
    date.setMonth(date.getMonth() - 1);
    this.selectedMonth = this.formatDateToYYYYMM(date);
    this.monthLabel = this.formatMonthLabel(this.selectedMonth);
    this.loadReportData();
  }

  nextMonth(): void {
    const date = new Date(this.selectedMonth + '-01');
    date.setMonth(date.getMonth() + 1);
    this.selectedMonth = this.formatDateToYYYYMM(date);
    this.monthLabel = this.formatMonthLabel(this.selectedMonth);
    this.loadReportData();
  }

  private formatDateToYYYYMM(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private getCurrentMonthValue(): string {
    return this.formatDateToYYYYMM(new Date());
  }

  private formatMonthLabel(value: string): string {
    const [year, month] = value.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(date);
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

  selectBreakdownType(type: 'category' | 'jar'): void {
    this.breakdownType = type;
  }

  selectReportPoint(index: number): void {
    if (index < 0 || index >= this.reportLabels.length) {
      this.reportActiveIndex = null;
      this.updateFilteredTransactions();
      return;
    }
    this.reportActiveIndex = index;
    this.updateFilteredTransactions();
  }

  get reportTotal(): number {
    if (this.reportMetricTab === 'income') {
      return this.summaryStats.totalIncome;
    }
    return this.summaryStats.totalExpense;
  }

  trackByTransactionId(_index: number, transaction: Transaction): number {
    return transaction.id;
  }

  private loadReportData(): void {
    this.isLoadingDashboard = true;
    forkJoin({
      jars: this.walletService.list().pipe(catchError(() => of([]))),
      expensesResponse: this.expenseService.list().pipe(catchError(() => of([]))),
      incomesResponse: this.incomeService.list().pipe(catchError(() => of([]))),
      incomeVsExpenses: this.statsService.getIncomeVsExpenses().pipe(catchError(() => of(null))),
      spendingAnalytics: this.statsService.getSpendingAnalytics(this.selectedMonth).pipe(catchError(() => of(null))),
      categories: this.categoryService
        .getTree()
        .pipe(catchError(() => of({ data: [] } as { data: CategoryTreeNode[] }))),
    })
      .pipe(
        finalize(() => {
          this.isLoadingDashboard = false;
        })
      )
      .subscribe(({ jars, expensesResponse, incomesResponse, incomeVsExpenses, spendingAnalytics, categories }) => {
        const jarById = (Array.isArray(jars) ? jars : []).reduce<Record<number, string>>((accumulator, jar) => {
          accumulator[jar.id] = jar.name;
          return accumulator;
        }, {});

        const categoriesData = Array.isArray(categories?.data)
          ? categories.data
          : [];
        this.categoryParentMap = this.buildCategoryParentMap(categoriesData);
        this.categoryIconMap = this.buildCategoryIconMap(categoriesData);

        const expenses = this.extractList(expensesResponse).map((expense: any) => {
          const transactionDate = this.parseDate(expense.spent_at || expense.created_at);
          return {
            id: Number(expense.id),
            jarId: expense.jar_id ?? null,
            jarName: expense?.jar?.name || jarById[expense.jar_id] || 'Wallet',
            title: expense.category || 'Expense',
            note: expense.note || '',
            timeLabel: this.formatDateLabel(transactionDate),
            date: transactionDate,
            amount: -Math.abs(Number(expense.amount) || 0),
            type: 'expense' as const,
            icon: this.getTransactionIcon(expense, 'expense'),
          };
        });

        const incomes = this.extractList(incomesResponse).map((income: any) => {
          const transactionDate = this.parseDate(income.received_at || income.created_at);
          return {
            id: Number(income.id),
            jarId: income.jar_id ?? null,
            jarName: income?.jar?.name || jarById[income.jar_id] || 'Wallet',
            title: income.source || 'Income',
            note: income.note || '',
            timeLabel: this.formatDateLabel(transactionDate),
            date: transactionDate,
            amount: Math.abs(Number(income.amount) || 0),
            type: 'income' as const,
            icon: this.getTransactionIcon(income, 'income'),
          };
        });

        this.allTransactions = [...expenses, ...incomes].sort(
          (first, second) => second.date.getTime() - first.date.getTime()
        );

        if (spendingAnalytics) {
          this.jarBreakdown = spendingAnalytics.expenses_by_budget.map(item => ({
            title: item.budget_name,
            amount: item.amount,
            percentage: item.percentage,
            color: item.budget_color
          }));
        }

        this.buildWeeklyReportSeries();
        this.buildIncomeExpenseChart(incomeVsExpenses);
        this.updateFilteredTransactions();
      });
  }

  private buildIncomeExpenseChart(data: IncomeVsExpenses | null): void {
    const fallbackLabel = this.monthLabel || this.getCurrentMonthLabel();
    const labels = Array.isArray(data?.months) ? data?.months.slice(-6) : [fallbackLabel];
    const income = Array.isArray(data?.income) ? data?.income.slice(-6) : [0];
    const expenses = Array.isArray(data?.expenses) ? data?.expenses.slice(-6) : [0];

    this.monthlyLabels = labels;
    this.monthlyIncomeSeries = this.normalizeSeriesLength(income, this.monthlyLabels.length);
    this.monthlyExpenseSeries = this.normalizeSeriesLength(expenses, this.monthlyLabels.length);

    this.updateReportChart();
  }

  private buildWeeklyReportSeries(): void {
    const [year, month] = this.selectedMonth.split('-').map(Number);
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);

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
          transactionDate.getFullYear() === year &&
          transactionDate.getMonth() === (month - 1) &&
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
      labels = [this.monthLabel];
      values = [0];
    }

    this.reportLabels = labels;
    if (this.reportActiveIndex !== null && this.reportActiveIndex >= this.reportLabels.length) {
      this.reportActiveIndex = null;
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

  private updateFilteredTransactions(): void {
    const [year, month] = this.selectedMonth.split('-').map(Number);
    const selectedMonthIndex = month - 1;

    let transactions = this.allTransactions;

    if (this.reportRangeTab === 'week') {
      const weekIndex = this.reportActiveIndex;
      if (weekIndex !== null) {
        const firstDayOfMonth = new Date(year, selectedMonthIndex, 1);
        const start = new Date(year, selectedMonthIndex, firstDayOfMonth.getDate() + weekIndex * 7);
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
        transactions = transactions.filter(t => t.date >= start && t.date <= end);
      } else {
        transactions = transactions.filter(t => t.date.getFullYear() === year && t.date.getMonth() === selectedMonthIndex);
      }
    } else { // month
      if (this.reportActiveIndex !== null) {
        const monthLabel = this.monthlyLabels[this.reportActiveIndex];
        const [monthName, yearStr] = monthLabel.split(' ');
        const monthIdx = new Date(Date.parse(monthName +" 1, 2012")).getMonth();
        transactions = transactions.filter(t => t.date.getFullYear() === parseInt(yearStr) && t.date.getMonth() === monthIdx);
      } else {
        transactions = transactions.filter(t => t.date.getFullYear() === year && t.date.getMonth() === selectedMonthIndex);
      }
    }

    this.filteredTransactions = transactions;
    this.calculateSummaryStats(transactions);
    this.calculateCategoryBreakdown(transactions);
  }

  private calculateSummaryStats(transactions: Transaction[]): void {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // Calculate average per day
    let avgPerDay = 0;
    if (transactions.length > 0) {
      const expenseTxs = transactions.filter(t => t.type === 'expense');
      if (expenseTxs.length > 0) {
        const dates = expenseTxs.map(t => t.date.getTime());
        const minDate = Math.min(...dates);
        const maxDate = Math.max(...dates);
        const days = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1);
        avgPerDay = totalExpense / days;
      }
    }

    this.summaryStats = {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      avgPerDay,
      transactionCount: transactions.length
    };
  }

  private calculateCategoryBreakdown(transactions: Transaction[]): void {
    const expenses = transactions.filter(t => t.type === 'expense');

    if (expenses.length === 0) {
      this.categoryBreakdown = [];
      return;
    }

    const grouped = expenses.reduce<Record<string, number>>((acc, t) => {
      const category = this.getParentCategoryTitle(t.title);
      acc[category] = (acc[category] || 0) + Math.abs(t.amount);
      return acc;
    }, {});

    const total = Object.values(grouped).reduce((sum, val) => sum + val, 0);

    this.categoryBreakdown = Object.entries(grouped)
      .map(([title, amount]) => ({
        title,
        amount,
        percentage: (amount / total) * 100
      }))
      .sort((a, b) => b.amount - a.amount);
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

  private buildCategoryIconMap(tree: CategoryTreeNode[]): Record<string, string> {
    const map: Record<string, string> = {};

    tree.forEach((parent) => {
      const parentName = parent.name?.trim();
      if (parentName && parent.icon) {
        map[parentName.toLowerCase()] = parent.icon;
      }

      parent.children.forEach((child) => {
        const childName = child.name?.trim();
        if (childName && child.icon) {
          map[childName.toLowerCase()] = child.icon;
        }
      });
    });

    return map;
  }

  private getTransactionIcon(item: any, type: 'income' | 'expense'): string {
     const name = (type === 'income' ? item.source : item.category || '').toLowerCase();
     
     // 1. Try to find in category icon map
     if (this.categoryIconMap[name]) {
       return this.categoryIconMap[name];
     }
 
     if (type === 'income') {
       return 'cash-outline';
     }

     // 2. Fallback to hardcoded mapping (similar to listing view)
     return this.getFallbackExpenseIcon(name);
   }

  private getFallbackExpenseIcon(category: string): string {
    category = category.toLowerCase();
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

  private getParentCategoryTitle(rawTitle: string | null | undefined): string {
    const fallback = rawTitle && rawTitle.trim().length > 0 ? rawTitle.trim() : 'Other';
    const normalized = fallback.toLowerCase();

    const parent = this.categoryParentMap[normalized];
    if (parent && parent.trim().length > 0) {
      return parent;
    }

    return fallback;
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
    const amount = Math.abs(this.parseAmount(value));
    if (this.selectedCurrencyCode === 'VND') {
      return new Intl.NumberFormat('vi-VN').format(amount);
    }
    return formatCurrencyAmount(amount, this.selectedCurrencyCode);
  }

  getCurrencySymbol(): string {
    if (this.selectedCurrencyCode === 'VND') return 'đ';
    if (this.selectedCurrencyCode === 'USD') return '$';
    if (this.selectedCurrencyCode === 'EUR') return '€';
    return '';
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
