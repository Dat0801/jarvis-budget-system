import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule, ModalController } from '@ionic/angular';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { CategoriesPage } from '../../categories/categories.page';
import { catchError, finalize, of } from 'rxjs';
import { Budget, BudgetService, Transaction } from '../../../services/budget.service';
import { CategoryService, CategoryTreeNode } from '../../../services/category.service';
import { ExpenseService } from '../../../services/expense.service';
import { WalletService, Wallet } from '../../../services/wallet.service';
import { formatVndAmountInput, parseVndAmount } from '../../../utils/vnd-amount.util';
import { formatCurrencyAmount, getStoredCurrencyCode } from '../../../utils/currency.util';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  chevronForwardOutline,
  basketOutline,
  walletOutline,
  cashOutline,
  cardOutline,
  briefcaseOutline,
  homeOutline,
  carOutline,
  airplaneOutline,
  giftOutline,
  heartOutline,
  fitnessOutline,
  schoolOutline,
  restaurantOutline,
  cartOutline,
  shirtOutline,
  constructOutline,
  hammerOutline,
  flashOutline,
  waterOutline,
  wifiOutline,
  tvOutline,
  phonePortraitOutline,
  gameControllerOutline,
  musicalNotesOutline,
  cameraOutline,
  brushOutline,
  colorWandOutline,
  starOutline,
  happyOutline,
  shieldCheckmarkOutline,
  createOutline,
  trashOutline,
  calendarOutline,
  swapHorizontalOutline,
  bagOutline,
  cart,
} from 'ionicons/icons';

type BudgetPeriod = 'week' | 'month' | 'quarter' | 'year';

interface BudgetCategoryOption {
  value: string;
  label: string;
  treeLabel: string;
  categoryName: string;
  subCategoryName?: string;
}

export interface JarDetail extends Budget {
  target?: number;
  transactions?: Transaction[];
  avgDailySpend?: number;
  cycleRemaining?: number;
}

@Component({
  selector: 'app-jar-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, PageHeaderComponent],
  templateUrl: './jar-detail.page.html',
  styleUrls: ['./jar-detail.page.scss'],
})
export class JarDetailPage implements OnInit {
  jar: JarDetail | null = null;
  transactions: Transaction[] = [];
  expensesByCategory: Record<string, number> = {};
  isLoadingJar = false;
  isLoadingTransactions = false;
  isAddMoneyOpen = false;
  isEditJarOpen = false;
  addAmount = '';
  selectedBudgetCategoryValue = '';
  editBudgetAmount = '';
  editBudgetIcon = 'basket-outline';
  editBudgetCurrency = 'VND';
  editBudgetWalletId: number | null = null;
  editBudgetPeriod: BudgetPeriod = 'month';
  editRepeatThisBudget = false;
  budgetCategories: CategoryTreeNode[] = [];
  wallets: Wallet[] = [];
  readonly currencyOptions = ['VND', 'USD', 'EUR', 'JPY', 'GBP'];
  readonly budgetPeriodOptions: BudgetPeriod[] = ['week', 'month', 'quarter', 'year'];
  jarId: number | null = null;
  parseFloat = parseFloat;

  constructor(
    private budgetService: BudgetService,
    private expenseService: ExpenseService,
    private categoryService: CategoryService,
    private walletService: WalletService,
    private route: ActivatedRoute,
    private router: Router,
    private alertController: AlertController,
    private modalController: ModalController
  ) {
    addIcons({
      closeOutline,
      chevronForwardOutline,
      basketOutline,
      walletOutline,
      cashOutline,
      cardOutline,
      briefcaseOutline,
      homeOutline,
      carOutline,
      airplaneOutline,
      giftOutline,
      heartOutline,
      fitnessOutline,
      schoolOutline,
      restaurantOutline,
      cartOutline,
      shirtOutline,
      constructOutline,
      hammerOutline,
      flashOutline,
      waterOutline,
      wifiOutline,
      tvOutline,
      phonePortraitOutline,
      gameControllerOutline,
      musicalNotesOutline,
      cameraOutline,
      brushOutline,
      colorWandOutline,
      starOutline,
      happyOutline,
      shieldCheckmarkOutline,
      createOutline,
      trashOutline,
      calendarOutline,
      swapHorizontalOutline,
      bagOutline,
      cart,
    });
  }

  ngOnInit(): void {
    this.jarId = Number(this.route.snapshot.paramMap.get('id'));

    this.route.queryParamMap.subscribe((params) => {
      const selectedCategory = params.get('selectedCategory');
      const categoryIcon = params.get('categoryIcon');
      const returnMode = params.get('returnMode');

      if (selectedCategory) {
        this.selectedBudgetCategoryValue = selectedCategory;
        if (categoryIcon) {
          this.editBudgetIcon = categoryIcon;
        }
      }

      if (returnMode === 'editBudget') {
        this.isEditJarOpen = true;
      }

      if (selectedCategory || returnMode) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { selectedCategory: null, categoryIcon: null, returnMode: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });

    this.loadBudgetCategories();
    this.loadWallets();
    this.loadExpenseTotals();
    if (this.jarId) {
      this.loadJarDetail();
    }
  }

  loadWallets(): void {
    this.walletService.list().subscribe((wallets) => {
      this.wallets = wallets;
    });
  }

  loadJarDetail(): void {
    if (!this.jarId) return;
    this.isLoadingJar = true;
    this.budgetService.detail(this.jarId).pipe(finalize(() => {
      this.isLoadingJar = false;
    })).subscribe((jar: JarDetail) => {
      this.jar = jar;
      this.selectedBudgetCategoryValue = this.getCategoryValueFromJar(jar);
      this.editBudgetAmount = formatVndAmountInput(this.parseAmount(jar.balance));
      this.editBudgetIcon = jar.icon || 'basket-outline';
      this.editBudgetCurrency = jar.currency_unit || 'VND';
      this.editBudgetWalletId = jar.wallet_id || null;
      this.editBudgetPeriod = this.getPeriodFromBudgetDate(jar.budget_date);
      this.editRepeatThisBudget = !!jar.repeat_this_budget;
      this.loadTransactions();
    });
  }

  loadTransactions(): void {
    if (!this.jarId) return;
    this.isLoadingTransactions = true;
    this.budgetService.getTransactions(this.jarId).pipe(finalize(() => {
      this.isLoadingTransactions = false;
    })).subscribe((response) => {
      this.transactions = response.data || [];
    });
  }

  getSpentAmount(): number {
    const budgetCategoryKey = this.getBudgetCategoryKey();
    if (!budgetCategoryKey) {
      return 0;
    }

    const spentFromLinkedTransactions = this.transactions.reduce((sum, transaction) => {
      if (transaction.type !== 'expense') {
        return sum;
      }

      const transactionCategoryKey = this.toCategoryKey(transaction.category);
      if (transactionCategoryKey !== budgetCategoryKey) {
        return sum;
      }

      return sum + this.parseAmount(transaction.amount);
    }, 0);

    if (spentFromLinkedTransactions > 0) {
      return spentFromLinkedTransactions;
    }

    return this.expensesByCategory[budgetCategoryKey] || 0;
  }

  getLeftAmount(): number {
    if (!this.jar) {
      return 0;
    }

    const budgetLimit = this.getBudgetLimitAmount();
    const spent = this.getSpentAmount();
    return Math.max(budgetLimit - spent, 0);
  }

  getOverspentAmount(): number {
    const budgetLimit = this.getBudgetLimitAmount();
    const spent = this.getSpentAmount();
    return Math.max(spent - budgetLimit, 0);
  }

  isOverspent(): boolean {
    return this.getOverspentAmount() > 0;
  }

  getSpentPercentage(): number {
    const spent = this.getSpentAmount();
    const budgetLimit = this.getBudgetLimitAmount();

    if (budgetLimit <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((spent / budgetLimit) * 100));
  }

  formatCurrency(value: string | number): string {
    return formatCurrencyAmount(this.parseAmount(value), getStoredCurrencyCode());
  }

  getBudgetCycleDisplay(): string {
    const startDate = this.getCycleStartDate();
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endStart = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysLeft = Math.max(0, Math.ceil((endStart.getTime() - todayStart.getTime()) / msPerDay));

    return `${this.formatDayMonth(startDate)} - ${this.formatDayMonth(endDate)} ${daysLeft} days left`;
  }

  getBudgetDateRangeDisplay(): string {
    const startDate = this.getCycleStartDate();
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    return `${this.formatDayMonth(startDate)} - ${this.formatDayMonth(endDate)}`;
  }

  getBudgetDaysLeft(): number {
    const startDate = this.getCycleStartDate();
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endStart = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.ceil((endStart.getTime() - todayStart.getTime()) / msPerDay));
  }

  getTransactionIcon(transaction: Transaction): string {
    if (transaction.type === 'expense') {
      const category = transaction.category?.toLowerCase() || '';
      if (category.includes('grocery') || category.includes('food')) return 'cart-outline';
      if (category.includes('transfer')) return 'swap-horizontal-outline';
      if (category.includes('shopping')) return 'bag-outline';
      return 'cart-outline';
    }
    return 'wallet-outline';
  }

  getTransactionColor(transaction: Transaction): string {
    if (transaction.type === 'expense') return 'danger';
    return 'success';
  }

  getFormattedDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today, ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  openAddMoney(): void {
    this.isAddMoneyOpen = true;
  }

  closeAddMoney(): void {
    this.isAddMoneyOpen = false;
    this.addAmount = '';
  }

  submitAddMoney(): void {
    if (!this.jarId || !this.addAmount) return;
    const amount = parseVndAmount(this.addAmount);
    if (amount && amount > 0) {
      this.budgetService.addMoney(this.jarId, amount).subscribe(() => {
        this.closeAddMoney();
        this.loadJarDetail();
      });
    }
  }

  async onAddAmountInput(event: any): Promise<void> {
    const ionInput = event.target as HTMLIonInputElement;
    const input = await ionInput.getInputElement();
    const originalValue = input.value || '';
    const digits = originalValue.replace(/\D/g, '');
    const formatted = formatVndAmountInput(digits);
    
    if (this.addAmount !== formatted) {
      const cursor = input.selectionStart || 0;
      const digitsBeforeCursor = originalValue.substring(0, cursor).replace(/\D/g, '').length;
      this.addAmount = formatted;
      input.value = formatted;
      let newCursor = 0;
      let digitsFound = 0;
      for (let i = 0; i < formatted.length && digitsFound < digitsBeforeCursor; i++) {
        if (/\d/.test(formatted[i])) digitsFound++;
        newCursor = i + 1;
      }
      input.setSelectionRange(newCursor, newCursor);
    }
  }

  get canSubmitAddMoney(): boolean {
    const amount = parseVndAmount(this.addAmount);
    return amount !== null && amount > 0;
  }

  openEditJar(): void {
    if (this.jar) {
      this.selectedBudgetCategoryValue = this.getCategoryValueFromJar(this.jar);
      this.editBudgetAmount = formatVndAmountInput(this.parseAmount(this.jar.balance));
      this.editBudgetPeriod = this.getPeriodFromBudgetDate(this.jar.budget_date);
      this.editRepeatThisBudget = !!this.jar.repeat_this_budget;
    }
    this.isEditJarOpen = true;
  }

  closeEditJar(): void {
    this.isEditJarOpen = false;
  }

  submitEditJar(): void {
    if (!this.jarId) return;
    const category = this.selectedBudgetCategoryLabel;
    const amount = parseVndAmount(this.editBudgetAmount);
    if (!category || !amount) {
      return;
    }

    this.budgetService.update(this.jarId, {
      category,
      amount,
      icon: this.editBudgetIcon,
      currency_unit: this.editBudgetCurrency,
      wallet_id: this.editBudgetWalletId,
      budget_date: this.getSelectedPeriodStartDate(),
      repeat_this_budget: this.editRepeatThisBudget,
    }).subscribe((updatedJar: any) => {
      this.jar = { ...this.jar, ...updatedJar };
      this.closeEditJar();
    });
  }

  async onEditBudgetAmountInput(event: any): Promise<void> {
    const ionInput = event.target as HTMLIonInputElement;
    const input = await ionInput.getInputElement();
    const originalValue = input.value || '';
    const digits = originalValue.replace(/\D/g, '');
    const formatted = formatVndAmountInput(digits);
    
    if (this.editBudgetAmount !== formatted) {
      const cursor = input.selectionStart || 0;
      const digitsBeforeCursor = originalValue.substring(0, cursor).replace(/\D/g, '').length;
      this.editBudgetAmount = formatted;
      input.value = formatted;
      let newCursor = 0;
      let digitsFound = 0;
      for (let i = 0; i < formatted.length && digitsFound < digitsBeforeCursor; i++) {
        if (/\d/.test(formatted[i])) digitsFound++;
        newCursor = i + 1;
      }
      input.setSelectionRange(newCursor, newCursor);
    }
  }

  get canUpdateJar(): boolean {
    return this.selectedBudgetCategoryLabel.length > 0 && !!parseVndAmount(this.editBudgetAmount);
  }

  get selectedBudgetCategoryLabel(): string {
    const selected = this.budgetCategoryOptions.find(
      (option) => option.value === this.selectedBudgetCategoryValue
    );

    if (!selected) {
      return '';
    }

    return selected.subCategoryName || selected.categoryName;
  }

  get selectedPeriodLabel(): string {
    return this.getPeriodOptionLabel(this.editBudgetPeriod);
  }

  async openCategorySelector(): Promise<void> {
    if (!this.jarId) {
      return;
    }

    const modal = await this.modalController.create({
      component: CategoriesPage,
      componentProps: {
        isModal: true,
        initialSelectMode: true,
        initialTab: 'expense',
        initialJarId: this.jarId,
        initialReturnUrl: `/tabs/budgets/${this.jarId}`,
        initialReturnMode: 'editBudget',
      },
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data && data.selectedCategory) {
      this.selectedBudgetCategoryValue = data.selectedCategory;
      if (data.categoryData?.icon) {
        this.editBudgetIcon = data.categoryData.icon;
      }
      this.isEditJarOpen = true;
    } else {
      // Re-open the edit budget modal if canceled
      this.isEditJarOpen = true;
    }
  }

  get budgetCategoryOptions(): BudgetCategoryOption[] {
    const options: BudgetCategoryOption[] = [];

    this.budgetCategories.forEach((category) => {
      options.push({
        value: `category:${category.id}`,
        label: category.name,
        treeLabel: `▸ ${category.name}`,
        categoryName: category.name,
      });

      category.children.forEach((subCategory) => {
        options.push({
          value: `sub:${subCategory.id}`,
          label: `${category.name} › ${subCategory.name}`,
          treeLabel: `  └─ ${subCategory.name}`,
          categoryName: category.name,
          subCategoryName: subCategory.name,
        });
      });
    });

    return options;
  }

  getPeriodOptionLabel(period: BudgetPeriod): string {
    const range = this.getPeriodRange(period);
    const periodName = `This ${period}`;
    return `${periodName} (${this.formatDayMonth(range.start)} - ${this.formatDayMonth(range.end)})`;
  }

  async confirmDeleteJar(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete budget',
      message: 'Are you sure you want to delete this budget?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.deleteJar();
          },
        },
      ],
    });

    await alert.present();
  }

  goBack(): void {
    this.router.navigate(['/tabs/budgets']);
  }

  seeAllTransactions(): void {
    this.router.navigate(['/tabs/budgets', this.jarId, 'activity']);
  }

  private deleteJar(): void {
    if (!this.jarId) {
      return;
    }

    this.budgetService.remove(this.jarId).subscribe(() => {
      this.router.navigate(['/tabs/budgets']);
    });
  }

  private loadBudgetCategories(): void {
    this.categoryService.getTree('expense').subscribe({
      next: (response) => {
        this.budgetCategories = response.data || [];
      },
      error: () => {
        this.budgetCategories = [];
      },
    });
  }

  private loadExpenseTotals(): void {
    this.expenseService.list().pipe(
      catchError(() => of([]))
    ).subscribe((response: unknown) => {
      this.expensesByCategory = this.buildExpensesByCategory(response);
    });
  }

  private parseAmount(value: string | number): number {
    const raw = value?.toString() ?? '0';
    const normalized = raw.replace(/[^0-9.-]+/g, '');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private getBudgetLimitAmount(): number {
    if (!this.jar) {
      return 0;
    }

    const explicitTarget = Number(this.jar.target);
    if (Number.isFinite(explicitTarget) && explicitTarget > 0) {
      return explicitTarget;
    }

    const currentBalance = this.parseAmount(this.jar.balance);
    return Math.max(0, currentBalance);
  }

  private getBudgetCategoryKey(): string {
    return this.toCategoryKey(this.jar?.category || this.jar?.name);
  }

  private toCategoryKey(value?: string | null): string {
    return (value || '').trim().toLowerCase();
  }

  private buildExpensesByCategory(expensesResponse: any): Record<string, number> {
    const expenses = this.extractExpenseList(expensesResponse);

    return expenses.reduce((accumulator: Record<string, number>, expense: any) => {
      const categoryKey = this.toCategoryKey(expense?.category);
      if (!categoryKey) {
        return accumulator;
      }

      const amount = Number(expense?.amount) || 0;
      accumulator[categoryKey] = (accumulator[categoryKey] || 0) + Math.abs(amount);
      return accumulator;
    }, {});
  }

  private extractExpenseList(expensesResponse: any): any[] {
    if (Array.isArray(expensesResponse)) {
      return expensesResponse;
    }

    if (Array.isArray(expensesResponse?.data)) {
      return expensesResponse.data;
    }

    return [];
  }

  private getCycleStartDate(): Date {
    if (this.jar?.budget_date) {
      const parsed = new Date(this.jar.budget_date);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private getCategoryValueFromJar(jar: JarDetail): string {
    const rawCategory = (jar.category || jar.name || '').trim().toLowerCase();
    if (!rawCategory) {
      return '';
    }

    const matched = this.budgetCategoryOptions.find((option) => {
      const subName = option.subCategoryName?.trim().toLowerCase();
      const categoryName = option.categoryName.trim().toLowerCase();
      return rawCategory === subName || rawCategory === categoryName;
    });

    return matched?.value || '';
  }

  private getPeriodFromBudgetDate(budgetDate?: string | null): BudgetPeriod {
    if (!budgetDate) {
      return 'month';
    }

    const parsedDate = new Date(budgetDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return 'month';
    }

    const normalizedDate = this.normalizeDate(parsedDate);
    const periods: BudgetPeriod[] = ['week', 'month', 'quarter', 'year'];
    const matchedPeriod = periods.find((period) => {
      const range = this.getPeriodRange(period);
      return this.normalizeDate(range.start).getTime() === normalizedDate.getTime();
    });

    return matchedPeriod || 'month';
  }

  private getSelectedPeriodStartDate(): string {
    const range = this.getPeriodRange(this.editBudgetPeriod);
    const year = range.start.getFullYear();
    const month = String(range.start.getMonth() + 1).padStart(2, '0');
    const day = String(range.start.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getPeriodRange(period: BudgetPeriod): { start: Date; end: Date } {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDay();

    if (period === 'week') {
      const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
      const start = new Date(currentYear, currentMonth, now.getDate() + mondayOffset);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      return { start, end };
    }

    if (period === 'quarter') {
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      const start = new Date(currentYear, quarterStartMonth, 1);
      const end = new Date(currentYear, quarterStartMonth + 3, 0);
      return { start, end };
    }

    if (period === 'year') {
      const start = new Date(currentYear, 0, 1);
      const end = new Date(currentYear, 11, 31);
      return { start, end };
    }

    const start = new Date(currentYear, currentMonth, 1);
    const end = new Date(currentYear, currentMonth + 1, 0);
    return { start, end };
  }

  private normalizeDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private formatDayMonth(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }
}
