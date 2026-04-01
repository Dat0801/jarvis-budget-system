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
  fastFoodOutline,
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
  private rawExpenseList: any[] = [];
  isLoadingJar = false;
  isLoadingTransactions = false;
  isAddMoneyOpen = false;
  isEditJarOpen = false;
  addAmount = '';
  selectedBudgetCategoryValues: string[] = [];
  editBudgetName = '';
  editBudgetAmount = '';
  editBudgetIcon = 'basket-outline';
  editBudgetCurrency = 'VND';
  editBudgetWalletId: number | null = null;
  editBudgetPeriod: BudgetPeriod = 'month';
  editRepeatThisBudget = false;
  budgetCategories: CategoryTreeNode[] = [];
  categoryIconMap: Record<string, string> = {};
  wallets: Wallet[] = [];
  readonly categorySelectInterfaceOptions = { cssClass: 'category-tree-sheet' };
  readonly currencyOptions = ['VND', 'USD', 'EUR', 'JPY', 'GBP'];
  readonly budgetPeriodOptions: BudgetPeriod[] = ['week', 'month', 'quarter', 'year'];
  jarId: number | null = null;
  parseFloat = parseFloat;

  // Filter states
  selectedMonthKey = '';
  months: { key: string; label: string; start: string; end: string }[] = [];
  selectedSubCategory = '';
  selectedWeek = '';
  subCategories: string[] = [];
  weeks: { label: string, start: string, end: string }[] = [];

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
      fastFoodOutline,
    });
  }

  ngOnInit(): void {
    this.jarId = Number(this.route.snapshot.paramMap.get('id'));
    this.generateMonths();
    this.selectedMonthKey = this.getMonthKey(new Date());

    this.route.queryParamMap.subscribe((params) => {
      const selectedCategory = params.get('selectedCategory');
      const categoryIcon = params.get('categoryIcon');
      const returnMode = params.get('returnMode');

      if (selectedCategory) {
        this.selectedBudgetCategoryValues = [selectedCategory];
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
    this.generateWeeks();
    if (this.jarId) {
      this.loadJarDetail();
    }
  }

  private getMonthKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private generateMonths(): void {
    const months: { key: string; label: string; start: string; end: string }[] = [];
    const now = new Date();
    const cursor = new Date(now.getFullYear(), now.getMonth(), 1);

    for (let i = 0; i < 18; i++) {
      const start = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      const key = this.getMonthKey(start);
      const label = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`;
      const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
      months.push({ key, label, start: startStr, end: endStr });
    }

    this.months = months;
  }

  generateWeeks(): void {
    const weeks = [];
    const now = new Date();
    
    // Calculate current week (Monday-Sunday)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const currentMonday = new Date(now.setDate(diff));
    currentMonday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 5; i++) {
      const start = new Date(currentMonday);
      start.setDate(currentMonday.getDate() - (i * 7));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const label = i === 0 ? 'This Week' : `${i} week${i > 1 ? 's' : ''} ago`;
      const startStr = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
      const endStr = end.getFullYear() + '-' + String(end.getMonth() + 1).padStart(2, '0') + '-' + String(end.getDate()).padStart(2, '0');
      
      weeks.push({
        label,
        start: startStr,
        end: endStr
      });
    }
    this.weeks = weeks;
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
      this.selectedBudgetCategoryValues = this.getCategoryValuesFromJar(jar);
      this.editBudgetName = jar.name || '';
      this.editBudgetAmount = formatVndAmountInput(this.parseAmount(jar.balance));
      this.editBudgetIcon = jar.icon || 'basket-outline';
      this.editBudgetCurrency = jar.currency_unit || 'VND';
      this.editBudgetWalletId = jar.wallet_id || null;
      this.editBudgetPeriod = this.getPeriodFromBudgetDate(jar.budget_date);
      this.editRepeatThisBudget = !!jar.repeat_this_budget;
      this.updateSubCategories();
      this.loadTransactions();
    });
  }

  loadTransactions(): void {
    if (!this.jarId) return;
    this.isLoadingTransactions = true;
    
    const filters: any = {};
    if (this.selectedSubCategory) {
      filters.category = this.selectedSubCategory;
    }

    if (this.selectedMonthKey) {
      const month = this.months.find(m => m.key === this.selectedMonthKey);
      if (month) {
        filters.start_date = month.start;
        filters.end_date = month.end;
      }
    } else {
      // Explicitly request all months; otherwise backend defaults budgets to current month.
      filters.all_months = true;
    }
    
    if (this.selectedWeek) {
      const week = this.weeks.find(w => w.label === this.selectedWeek);
      if (week) {
        filters.start_date = week.start;
        filters.end_date = week.end;
      }
    }

    this.budgetService.getTransactions(this.jarId, filters).pipe(finalize(() => {
      this.isLoadingTransactions = false;
    })).subscribe((response) => {
      this.transactions = response.data || [];
    });
  }

  onMonthChange(event: any): void {
    this.selectedMonthKey = event.detail.value;
    this.selectedWeek = '';
    this.loadTransactions();
  }

  updateSubCategories(): void {
    if (!this.jar || !this.budgetCategories.length) return;
    
    const jarCategoryName = (this.jar.category || this.jar.name || '').trim().toLowerCase();
    
    // Find matching category in tree
    const parentCategory = this.budgetCategories.find(c => 
      c.name.trim().toLowerCase() === jarCategoryName
    );

    if (parentCategory && parentCategory.children && parentCategory.children.length > 0) {
      this.subCategories = parentCategory.children.map(c => c.name);
    } else {
      this.subCategories = [];
    }
  }

  onSubCategoryChange(event: any): void {
    this.selectedSubCategory = event.detail.value;
    this.loadTransactions();
  }

  onWeekChange(event: any): void {
    this.selectedWeek = event.detail.value;
    this.loadTransactions();
  }

  getSpentAmount(): number {
    if (this.jar?.spent !== undefined) {
      return this.jar.spent;
    }

    const budgetCategoryKey = this.getBudgetCategoryKey();
    if (!budgetCategoryKey) {
      return 0;
    }

    const spentFromLinkedTransactions = this.transactions.reduce((sum, transaction) => {
      if (transaction.type !== 'expense') {
        return sum;
      }

      if (!this.isTransactionInCurrentMonth(transaction)) {
        return sum;
      }

      // If the transaction is already in this.transactions, it was returned by the backend 
      // for this budget jar. We should include it in the spent calculation.
      return sum + this.parseAmount(transaction.amount);
    }, 0);

    if (spentFromLinkedTransactions > 0 || this.transactions.length > 0) {
      return spentFromLinkedTransactions;
    }

    return this.sumRawExpensesForJarCurrentMonth();
  }

  private isTransactionInCurrentMonth(t: Transaction): boolean {
    const raw = t.date || t.spent_at || t.created_at;
    if (!raw) {
      return false;
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return false;
    }
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  }

  private isRawExpenseInCurrentMonth(expense: { spent_at?: string; created_at?: string }): boolean {
    const raw = expense?.spent_at || expense?.created_at;
    if (!raw) {
      return false;
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      return false;
    }
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  }

  private sumRawExpensesForJarCurrentMonth(): number {
    if (!this.jar) {
      return 0;
    }
    const categoryKey = this.getBudgetCategoryKey();
    let sum = 0;
    for (const expense of this.rawExpenseList) {
      if (!this.isRawExpenseInCurrentMonth(expense)) {
        continue;
      }
      const amount = Math.abs(Number(expense?.amount) || 0);
      if (expense?.jar_id === this.jar.id) {
        sum += amount;
        continue;
      }
      if (categoryKey && this.toCategoryKey(expense?.category) === categoryKey) {
        sum += amount;
      }
    }
    return sum;
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
    const categoryName = (transaction.category || transaction.source || '').toLowerCase();
    
    // 1. Try to find in category icon map
    if (this.categoryIconMap[categoryName]) {
      return this.categoryIconMap[categoryName];
    }

    // 2. Fallback to hardcoded mapping
    if (transaction.type === 'expense') {
      if (categoryName.includes('grocery') || categoryName.includes('food')) return 'cart-outline';
      if (categoryName.includes('transfer')) return 'swap-horizontal-outline';
      if (categoryName.includes('shopping')) return 'bag-outline';
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
      this.selectedBudgetCategoryValues = this.getCategoryValuesFromJar(this.jar);
      this.editBudgetName = this.jar.name || '';
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
    const jarId = this.jarId;
    if (!jarId) return;
    const category = this.selectedBudgetPrimaryLabel;
    const amount = parseVndAmount(this.editBudgetAmount);
    if (!category || !amount) {
      return;
    }

    this.budgetService.update(jarId, {
      name: this.editBudgetName.trim() || undefined,
      category,
      category_ids: this.selectedCategoryIds,
      amount,
      icon: this.editBudgetIcon,
      currency_unit: this.editBudgetCurrency,
      wallet_id: this.editBudgetWalletId,
      budget_date: this.getSelectedPeriodStartDate(),
      repeat_this_budget: this.editRepeatThisBudget,
    }).subscribe((updatedJar: any) => {
      this.jar = { ...this.jar, ...updatedJar };
      this.closeEditJar();
      this.budgetService.detail(jarId).subscribe((fresh) => {
        this.jar = { ...this.jar, ...fresh };
      });
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
    return this.selectedCategoryIds.length > 0 && !!parseVndAmount(this.editBudgetAmount);
  }

  get selectedCategoryIds(): number[] {
    return this.selectedBudgetCategoryValues
      .map((v) => Number(String(v).split(':')[1] || v))
      .filter((id) => Number.isFinite(id) && id > 0);
  }

  get selectedBudgetPrimaryLabel(): string {
    const first = this.selectedBudgetCategoryValues[0];
    const selected = this.budgetCategoryOptions.find((option) => option.value === first);
    return selected?.label || '';
  }

  get selectedPeriodLabel(): string {
    return this.getPeriodOptionLabel(this.editBudgetPeriod);
  }

  // category selection is now done inline via multi-select

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
    this.categoryService.getTree().subscribe({
      next: (response) => {
        this.budgetCategories = response.data || [];
        this.categoryIconMap = this.buildCategoryIconMap(this.budgetCategories);
        this.updateSubCategories();
      },
      error: () => {
        this.budgetCategories = [];
        this.categoryIconMap = {};
      },
    });
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

  private loadExpenseTotals(): void {
    this.expenseService.list().pipe(
      catchError(() => of([]))
    ).subscribe((response: unknown) => {
      const list = this.extractExpenseList(response);
      this.rawExpenseList = list;
      this.expensesByCategory = this.buildExpensesByCategory(list);
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

  private buildExpensesByCategory(expenses: any[]): Record<string, number> {
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

  private getCategoryValuesFromJar(jar: JarDetail): string[] {
    const ids = (jar as any)?.categories?.map((c: any) => c?.id).filter((id: any) => Number.isFinite(id)) || [];
    if (ids.length > 0) {
      return ids.map((id: number) => `category:${id}`);
    }

    // Fallback for older jars that only have a single string category.
    const rawCategory = (jar.category || jar.name || '').trim().toLowerCase();
    if (!rawCategory) {
      return [];
    }

    const matched = this.budgetCategoryOptions.find((option) => {
      const subName = option.subCategoryName?.trim().toLowerCase();
      const categoryName = option.categoryName.trim().toLowerCase();
      return rawCategory === subName || rawCategory === categoryName;
    });

    return matched?.value ? [matched.value] : [];
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
