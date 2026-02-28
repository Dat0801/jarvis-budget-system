import { Component, OnInit } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { BudgetService, Budget, Transaction } from '../services/budget.service';
import { ExpenseService } from '../services/expense.service';
import { IncomeService } from '../services/income.service';
import { MonthlyReport, StatsService } from '../services/stats.service';
import { FabService } from '../services/fab.service';
import { WalletService, Wallet } from '../services/wallet.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ActionSheetController, IonicModule } from '@ionic/angular';
import { formatCurrencyAmount, getStoredCurrencyCode } from '../utils/currency.util';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  walletOutline,
  timeOutline,
  funnelOutline,
  calendarClearOutline,
  arrowDownCircleOutline,
  arrowUpCircleOutline,
  pieChartOutline,
  fastFoodOutline,
  airplaneOutline,
  homeOutline,
  cartOutline,
  medkitOutline,
  schoolOutline,
  cardOutline,
  cashOutline,
} from 'ionicons/icons';

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
  wallets: Wallet[] = [];
  groupedTransactions: TransactionGroup[] = [];
  allTransactions: TransactionItem[] = [];
  monthTabs: MonthTab[] = [];
  selectedTabKey = '';
  monthlyReports: MonthlyReport[] = [];
  isReportsModalOpen = false;

  isLoading = true;
  error: string | null = null;
  selectedJarId: number | null = null;

  totalBalance = 0;
  inflowTotal = 0;
  outflowTotal = 0;
  monthDeltaPercent = 0;

  // Search & Filter state
  showSearchBar = false;
  searchQuery = '';
  selectedTimeRange: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all' = 'month';
  timeRangeOptions = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'year', label: 'Year' },
    { value: 'all', label: 'All' }
  ];

  constructor(
    private budgetService: BudgetService,
    private expenseService: ExpenseService,
    private incomeService: IncomeService,
    private statsService: StatsService,
    private fabService: FabService,
    private walletService: WalletService,
    private router: Router,
    private route: ActivatedRoute,
    private actionSheetCtrl: ActionSheetController
  ) {
    addIcons({
      searchOutline,
      walletOutline,
      timeOutline,
      funnelOutline,
      calendarClearOutline,
      arrowDownCircleOutline,
      arrowUpCircleOutline,
      pieChartOutline,
      fastFoodOutline,
      airplaneOutline,
      homeOutline,
      cartOutline,
      medkitOutline,
      schoolOutline,
      cardOutline,
      cashOutline,
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.selectedJarId = params['jarId'] ? Number(params['jarId']) : null;
      this.loadTransactions();
    });
    this.loadWallets();
  }

  loadWallets(): void {
    this.walletService.list().subscribe((wallets) => {
      this.wallets = wallets;
    });
  }

  async openWalletPicker() {
    const buttons = this.wallets.map(wallet => ({
      text: wallet.name,
      handler: () => {
        this.selectedJarId = wallet.id;
        this.loadTransactions();
      }
    }));

    buttons.unshift({
      text: 'All Wallets',
      handler: () => {
        this.selectedJarId = null;
        this.loadTransactions();
      }
    });

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Wallet',
      buttons: [
        ...buttons,
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  async openTimeRangePicker() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Select Time Range',
      buttons: [
        ...this.timeRangeOptions.map(option => ({
          text: option.label,
          handler: () => {
            this.selectedTimeRange = option.value as any;
            this.applyFilters();
          }
        })),
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
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

        const expenses = this.extractList<ExpenseItem>(expensesResponse)
          .filter(item => !this.selectedJarId || Number(item.jar_id) === this.selectedJarId)
          .map((item) => {
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

        const incomes = this.extractList<IncomeItem>(incomesResponse)
          .filter(item => !this.selectedJarId || Number(item.jar_id) === this.selectedJarId)
          .map((item) => {
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
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load transactions';
        this.isLoading = false;
      },
    });
  }

  onWalletChange(event: any): void {
    this.selectedJarId = event.detail.value === -1 ? null : event.detail.value;
    this.loadTransactions();
  }

  onTimeRangeChange(event: any): void {
    this.selectedTimeRange = event.detail.value;
    this.applyFilters();
  }

  toggleSearchBar(): void {
    this.showSearchBar = !this.showSearchBar;
    if (!this.showSearchBar) {
      this.searchQuery = '';
      this.applyFilters();
    }
  }

  onSearchChange(event: any): void {
    this.searchQuery = event.detail.value || '';
    this.applyFilters();
  }

  private getFilteredTransactions(): TransactionItem[] {
    let filtered = [...this.allTransactions];
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.title.toLowerCase().includes(query) || 
        tx.subtitle.toLowerCase().includes(query)
      );
    }
    return filtered;
  }

  private applyFilters(): void {
    const filtered = this.getFilteredTransactions();
    this.calculateMonthlySummary(filtered);
    this.buildTabs();
    
    if (this.monthTabs.length > 0) {
      // If current selected key is not in new tabs, reset it
      if (!this.monthTabs.some(t => t.key === this.selectedTabKey)) {
        this.selectedTabKey = this.monthTabs[this.monthTabs.length - 1].key;
      }
      this.applySelectedMonthToFiltered(filtered);
    } else {
      this.groupedTransactions = this.groupByDate(filtered);
    }
  }

  private buildTabs(): void {
    if (this.selectedTimeRange === 'all') {
      this.monthTabs = [];
      return;
    }

    this.monthTabs = [];
    const now = new Date();
    const tabs: any[] = [];
    
    switch (this.selectedTimeRange) {
      case 'day':
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          tabs.push({
            key: this.getDayKey(d),
            label: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : this.formatDayLabel(d),
            year: d.getFullYear(),
            month: d.getMonth(),
            day: d.getDate()
          });
        }
        break;
      case 'week':
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i * 7);
          const startOfWeek = this.getStartOfWeek(d);
          tabs.push({
            key: this.getWeekKey(startOfWeek),
            label: i === 0 ? 'This week' : i === 1 ? 'Last week' : `Week ${this.getWeekNumber(startOfWeek)}`,
            year: startOfWeek.getFullYear(),
            month: startOfWeek.getMonth(),
            week: this.getWeekNumber(startOfWeek)
          });
        }
        break;
      case 'month':
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        for (let i = 23; i >= 0; i--) {
          const d = new Date(thisMonth);
          d.setMonth(d.getMonth() - i);
          tabs.push({
            key: this.getMonthKey(d),
            label: i === 0 ? 'This month' : i === 1 ? 'Last month' : this.formatOlderMonthLabel(d),
            year: d.getFullYear(),
            month: d.getMonth(),
          });
        }
        break;
      case 'quarter':
        for (let i = 7; i >= 0; i--) {
          const d = new Date(now);
          const currentQuarter = Math.floor(d.getMonth() / 3);
          const targetQuarterIndex = currentQuarter - i;
          const targetYear = d.getFullYear() + Math.floor(targetQuarterIndex / 4);
          const targetQuarter = ((targetQuarterIndex % 4) + 4) % 4;
          
          const q = targetQuarter + 1;
          tabs.push({
            key: `${targetYear}-Q${q}`,
            label: i === 0 ? 'This quarter' : `Q${q} ${targetYear}`,
            year: targetYear,
            quarter: q
          });
        }
        break;
      case 'year':
        for (let i = 4; i >= 0; i--) {
          const d = new Date(now);
          d.setFullYear(d.getFullYear() - i);
          tabs.push({
            key: `${d.getFullYear()}`,
            label: i === 0 ? 'This year' : `${d.getFullYear()}`,
            year: d.getFullYear()
          });
        }
        break;
    }
    
    this.monthTabs = tabs;
  }

  private getDayKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private formatDayLabel(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private getWeekKey(date: Date): string {
    return `${date.getFullYear()}-W${this.getWeekNumber(date)}`;
  }

  private getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(d.setDate(diff));
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  private applySelectedMonthToFiltered(transactions: TransactionItem[]): void {
    if (this.selectedTimeRange === 'all' || this.monthTabs.length === 0) {
      this.groupedTransactions = this.groupByDate(transactions);
      this.calculateInflowOutflow(transactions);
      return;
    }

    const activeTab = this.monthTabs.find((tab) => tab.key === this.selectedTabKey);
    if (!activeTab) {
      this.groupedTransactions = [];
      this.inflowTotal = 0;
      this.outflowTotal = 0;
      this.totalBalance = 0;
      return;
    }

    const selectedTransactions = transactions.filter((transaction) => {
      const d = transaction.date;
      switch (this.selectedTimeRange) {
        case 'day':
          return d.getFullYear() === (activeTab as any).year && 
                 d.getMonth() === (activeTab as any).month && 
                 d.getDate() === (activeTab as any).day;
        case 'week':
          return d.getFullYear() === (activeTab as any).year && 
                 this.getWeekNumber(d) === (activeTab as any).week;
        case 'month':
          return d.getFullYear() === activeTab.year && 
                 d.getMonth() === activeTab.month;
        case 'quarter':
          return d.getFullYear() === (activeTab as any).year && 
                 (Math.floor(d.getMonth() / 3) + 1) === (activeTab as any).quarter;
        case 'year':
          return d.getFullYear() === activeTab.year;
        default:
          return true;
      }
    });

    this.calculateInflowOutflow(selectedTransactions);
    this.groupedTransactions = this.groupByDate(selectedTransactions);
  }

  private calculateInflowOutflow(transactions: TransactionItem[]): void {
    let inflow = 0;
    let outflow = 0;
    transactions.forEach(tx => {
      if (tx.type === 'income') inflow += tx.amount;
      else outflow += tx.amount;
    });
    this.inflowTotal = inflow;
    this.outflowTotal = outflow;
    this.totalBalance = inflow - outflow;
  }

  onMonthChange(event: CustomEvent): void {
    const nextKey = (event.detail?.value || '').toString();
    this.selectedTabKey = nextKey;
    this.applySelectedMonthToFiltered(this.getFilteredTransactions());
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

  openTransactionDetail(transaction: TransactionItem): void {
    const [type, rawId] = transaction.id.split('-');
    if ((type !== 'income' && type !== 'expense') || !rawId) {
      return;
    }
    const id = Number(rawId);
    if (!Number.isFinite(id)) {
      return;
    }
    this.router.navigate(['/tabs/transactions', type, id]);
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

  getWalletName(jarId: number): string {
    const jar = this.jars.find(j => j.id === jarId);
    return jar ? jar.name : 'Transactions';
  }
}
