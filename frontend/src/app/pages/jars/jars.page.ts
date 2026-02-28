import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { CategoriesPage } from '../categories/categories.page';
import { ActivatedRoute, Router } from '@angular/router';
import { Budget, BudgetService } from '../../services/budget.service';
import { CategoryService, CategoryTreeNode } from '../../services/category.service';
import { FabService } from '../../services/fab.service';
import { ExpenseService } from '../../services/expense.service';
import { WalletService, Wallet } from '../../services/wallet.service';
import { formatVndAmountInput, parseVndAmount } from '../../utils/vnd-amount.util';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { formatCurrencyAmount, getStoredCurrencyCode } from '../../utils/currency.util';
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
} from 'ionicons/icons';

type BudgetPeriod = 'week' | 'month' | 'quarter' | 'year';

interface BudgetCategoryOption {
  value: string;
  label: string;
  treeLabel: string;
  categoryName: string;
  subCategoryName?: string;
}

@Component({
  selector: 'app-jars',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, PageHeaderComponent],
  templateUrl: './jars.page.html',
  styleUrls: ['./jars.page.scss'],
})
export class JarsPage implements OnInit {
  private readonly fabOwner = 'jars-budgets';
  jars: Budget[] = [];
  expensesByCategory: Record<string, number> = {};
  totalSaved = 0;
  totalSpent = 0;
  isLoadingJars = false;
  isCreateJarOpen = false;
  isIconPickerOpen = false;
  selectedBudgetCategoryValue = '';
  budgetAmount = '';
  budgetIcon = 'basket-outline';
  budgetCurrency = 'VND';
  budgetWalletId: number | null = null;
  budgetPeriod: BudgetPeriod = 'month';
  repeatThisBudget = false;
  budgetCategories: CategoryTreeNode[] = [];
  wallets: Wallet[] = [];
  readonly categorySelectInterfaceOptions = { cssClass: 'category-tree-sheet' };
  readonly budgetPeriodOptions: BudgetPeriod[] = ['week', 'month', 'quarter', 'year'];
  readonly currencyOptions = ['VND', 'USD', 'EUR', 'JPY', 'GBP'];
  readonly budgetIcons = [
    'basket-outline', 'cart-outline', 'restaurant-outline', 'cafe-outline',
    'home-outline', 'car-outline', 'airplane-outline', 'bus-outline',
    'shirt-outline', 'gift-outline', 'heart-outline', 'fitness-outline',
    'school-outline', 'briefcase-outline', 'wallet-outline', 'cash-outline',
    'card-outline', 'game-controller-outline', 'musical-notes-outline', 'tv-outline',
    'phone-portrait-outline', 'wifi-outline', 'flash-outline', 'water-outline',
    'hammer-outline', 'construct-outline', 'brush-outline', 'color-wand-outline',
    'camera-outline', 'star-outline', 'happy-outline', 'shield-checkmark-outline'
  ];
  private readonly targetOverrides = [
    { match: 'emergency', target: 10000 },
    { match: 'car', target: 45000 },
    { match: 'trip', target: 5000 },
  ];
  private readonly targetPattern = /\[target=(\d+(?:\.\d+)?)\]/;

  constructor(
    private budgetService: BudgetService,
    private expenseService: ExpenseService,
    private categoryService: CategoryService,
    private walletService: WalletService,
    private fabService: FabService,
    private route: ActivatedRoute,
    private router: Router,
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
    });
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const selectedCategory = params.get('selectedCategory');
      const returnMode = params.get('returnMode');

      if (selectedCategory) {
        this.selectedBudgetCategoryValue = selectedCategory;
      }

      if (returnMode === 'createBudget') {
        this.isCreateJarOpen = true;
      }

      if (selectedCategory || returnMode) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { selectedCategory: null, returnMode: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });

    this.loadBudgetCategories();
    this.loadWallets();
    this.loadJars();
  }

  loadWallets(): void {
    this.walletService.list().subscribe((wallets) => {
      this.wallets = wallets;
      
      // Set default wallet to 'Cash' if available
      if (this.wallets.length > 0 && !this.budgetWalletId) {
        const cashWallet = this.wallets.find(w => 
          w.name.toLowerCase().includes('cash') || 
          w.name.toLowerCase().includes('tiền mặt')
        );
        if (cashWallet) {
          this.budgetWalletId = cashWallet.id;
        }
      }
    });
  }

  ionViewWillEnter(): void {
    // Show the global FAB with the openCreateJar action
    this.fabService.showFab(() => this.openCreateJar(), 'add', this.fabOwner);
  }

  ionViewDidLeave(): void {
    // Hide the global FAB when leaving this page
    this.fabService.hideFab(this.fabOwner);
  }

  loadJars(): void {
    this.isLoadingJars = true;
    forkJoin({
      jars: this.budgetService.list().pipe(catchError(() => of([]))),
      expensesResponse: this.expenseService.list().pipe(catchError(() => of([]))),
    }).pipe(finalize(() => {
      this.isLoadingJars = false;
    })).subscribe(({ jars, expensesResponse }) => {
      this.jars = Array.isArray(jars) ? jars : [];
      this.expensesByCategory = this.buildExpensesByCategory(expensesResponse);
      this.updateTotals();
    });
  }

  openCreateJar(): void {
    this.isCreateJarOpen = true;
  }

  closeCreateJar(): void {
    this.isCreateJarOpen = false;
    this.resetCreateForm();
  }

  openIconPicker(): void {
    this.isIconPickerOpen = true;
  }

  closeIconPicker(): void {
    this.isIconPickerOpen = false;
  }

  selectIcon(icon: string): void {
    this.budgetIcon = icon;
    this.closeIconPicker();
  }

  submitCreateJar(): void {
    const category = this.selectedBudgetCategoryLabel;
    const amount = parseVndAmount(this.budgetAmount);
    if (!category || !amount) {
      return;
    }
    this.createJar({
      category,
      amount,
      icon: this.budgetIcon,
      currency_unit: this.budgetCurrency,
      wallet_id: this.budgetWalletId,
      budget_date: this.getSelectedPeriodStartDate(),
      repeat_this_budget: this.repeatThisBudget,
    });
    this.closeCreateJar();
  }

  onBudgetAmountInput(event: any): void {
    const input = event.target as HTMLInputElement;
    const originalValue = input.value || '';
    
    // Extract only digits
    const digits = originalValue.replace(/\D/g, '');
    const formatted = formatVndAmountInput(digits);
    
    if (this.budgetAmount !== formatted) {
      // Save cursor position
      const cursor = input.selectionStart || 0;
      const digitsBeforeCursor = originalValue.substring(0, cursor).replace(/\D/g, '').length;
      
      this.budgetAmount = formatted;
      input.value = formatted;
      
      // Restore cursor position
      let newCursor = 0;
      let digitsFound = 0;
      for (let i = 0; i < formatted.length && digitsFound < digitsBeforeCursor; i++) {
        if (/\d/.test(formatted[i])) {
          digitsFound++;
        }
        newCursor = i + 1;
      }
      input.setSelectionRange(newCursor, newCursor);
    }
  }

  get canSaveJar(): boolean {
    return this.selectedBudgetCategoryLabel.length > 0 && !!parseVndAmount(this.budgetAmount);
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

  get selectedBudgetCategoryLabel(): string {
    const selected = this.budgetCategoryOptions.find(
      (option) => option.value === this.selectedBudgetCategoryValue
    );

    if (!selected) {
      return '';
    }

    return selected.subCategoryName || selected.categoryName;
  }

  async openCategorySelector(): Promise<void> {
    const modal = await this.modalController.create({
      component: CategoriesPage,
      componentProps: {
        isModal: true,
        initialSelectMode: true,
        initialTab: 'expense',
        initialReturnUrl: '/tabs/budgets',
        initialReturnMode: 'createBudget',
      },
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (data && data.selectedCategory) {
      this.selectedBudgetCategoryValue = data.selectedCategory;
      this.isCreateJarOpen = true;
    } else {
      // Re-open the create budget modal if canceled
      this.isCreateJarOpen = true;
    }
  }

  get selectedPeriodLabel(): string {
    return this.getPeriodOptionLabel(this.budgetPeriod);
  }

  getPeriodOptionLabel(period: BudgetPeriod): string {
    const range = this.getPeriodRange(period);
    const periodName = `This ${period}`;
    return `${periodName} (${this.formatDateForRange(range.start)} - ${this.formatDateForRange(range.end)})`;
  }

  getJarTarget(jar: Budget): number {
    const name = jar.name.toLowerCase();
    const embeddedTarget = this.parseTargetFromDescription(jar.description);
    if (embeddedTarget) {
      return embeddedTarget;
    }
    const override = this.targetOverrides.find((item) => name.includes(item.match));
    return override?.target ?? 0;
  }

  getJarDescription(jar: Budget): string {
    return this.stripTargetTag(jar.description) || 'No description yet';
  }

  getJarProgress(jar: Budget): number {
    const target = this.getJarBudgetLimit(jar);
    const spent = this.getJarSpent(jar);
    if (target <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((spent / target) * 100));
  }

  getJarRemaining(jar: Budget): number {
    const target = this.getJarBudgetLimit(jar);
    const spent = this.getJarSpent(jar);
    return Math.max(0, target - spent);
  }

  getJarOverspent(jar: Budget): number {
    const target = this.getJarBudgetLimit(jar);
    const spent = this.getJarSpent(jar);
    return Math.max(0, spent - target);
  }

  isJarOverspent(jar: Budget): boolean {
    return this.getJarOverspent(jar) > 0;
  }

  getJarProgressClass(jar: Budget): string {
    if (this.isJarOverspent(jar)) {
      return 'progress-fill--overspent';
    }
    if (this.getJarRemaining(jar) > 0) {
      return 'progress-fill--can-spend';
    }
    return 'progress-fill--used';
  }

  getJarSpent(jar: Budget): number {
    const categoryKey = this.toCategoryKey(jar.category || jar.name);
    if (!categoryKey) {
      return 0;
    }
    return this.expensesByCategory[categoryKey] || 0;
  }

  getJarDisplayAmount(jar: Budget): number {
    return this.getJarBudgetLimit(jar);
  }

  get totalOverspent(): number {
    const diff = this.totalSaved - this.totalSpent;
    return diff < 0 ? Math.abs(diff) : 0;
  }

  get totalCanSpend(): number {
    const diff = this.totalSaved - this.totalSpent;
    return diff > 0 ? diff : 0;
  }

  get totalHeaderClass(): string {
    if (this.totalOverspent > 0) {
      return 'total-card--overspent';
    }
    if (this.totalCanSpend > 0) {
      return 'total-card--can-spend';
    }
    return '';
  }

  get daysLeftToEndOfMonth(): number {
    const today = new Date();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return Math.max(0, endOfMonth.getDate() - today.getDate());
  }

  private getJarBudgetLimit(jar: Budget): number {
    const explicitTarget = this.getJarTarget(jar);
    if (explicitTarget > 0) {
      return explicitTarget;
    }

    const targetFromApi = Number(jar.target);
    if (Number.isFinite(targetFromApi) && targetFromApi > 0) {
      return targetFromApi;
    }

    const currentBalance = this.parseBalance(jar.balance);
    return Math.max(0, currentBalance);
  }

  getJarIcon(jar: Budget): string {
    if (jar.icon) {
      return jar.icon;
    }

    const name = jar.name.toLowerCase();
    if (name.includes('emergency')) {
      return 'shield-checkmark';
    }
    if (name.includes('car')) {
      return 'car';
    }
    if (name.includes('trip')) {
      return 'airplane';
    }
    return 'basket-outline';
  }

  getJarIconClass(jar: Budget): string {
    const name = jar.name.toLowerCase();
    if (name.includes('emergency')) {
      return 'jar-icon--orange';
    }
    if (name.includes('car')) {
      return 'jar-icon--blue';
    }
    if (name.includes('trip')) {
      return 'jar-icon--pink';
    }
    return 'jar-icon--gray';
  }

  formatCurrency(value: number | string, withCents = false): string {
    const amount = typeof value === 'string' ? this.parseBalance(value) : value;
    return formatCurrencyAmount(amount, getStoredCurrencyCode(), withCents);
  }

  formatCompactAmount(value: number | string): string {
    const amount = typeof value === 'string' ? this.parseBalance(value) : value;
    const absAmount = Math.abs(amount);

    if (absAmount >= 1_000_000) {
      return `${this.formatCompactValue(amount / 1_000_000, 2)}M`;
    }

    if (absAmount >= 1_000) {
      return `${this.formatCompactValue(amount / 1_000, 1)}K`;
    }

    return `${Math.round(amount)}`;
  }

  navigateToJar(jarId: number): void {
    this.router.navigate(['/tabs/budgets', jarId]);
  }

  private createJar(payload: {
    category: string;
    amount: number;
    icon?: string;
    currency_unit?: string;
    wallet_id?: number | null;
    budget_date: string;
    repeat_this_budget: boolean;
  }): void {
    this.budgetService.create(payload).subscribe(() => this.loadJars());
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

  private resetCreateForm(): void {
    this.selectedBudgetCategoryValue = '';
    this.budgetAmount = '';
    this.budgetIcon = 'basket-outline';
    this.budgetCurrency = 'VND';
    
    // Default to 'Cash' wallet if available
    if (this.wallets.length > 0) {
      const cashWallet = this.wallets.find(w => 
        w.name.toLowerCase().includes('cash') || 
        w.name.toLowerCase().includes('tiền mặt')
      );
      this.budgetWalletId = cashWallet ? cashWallet.id : null;
    } else {
      this.budgetWalletId = null;
    }
    
    this.budgetPeriod = 'month';
    this.repeatThisBudget = false;
  }

  private parseTargetFromDescription(description?: string | null): number | null {
    if (!description) {
      return null;
    }
    const match = description.match(this.targetPattern);
    if (!match) {
      return null;
    }
    const parsed = Number.parseFloat(match[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private stripTargetTag(description?: string | null): string {
    if (!description) {
      return '';
    }
    return description.replace(this.targetPattern, '').trim();
  }

  private parseBalance(balance: string): number {
    const normalized = balance.replace(/[^0-9.-]+/g, '');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
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

  private toCategoryKey(value?: string | null): string {
    return (value || '').trim().toLowerCase();
  }

  private updateTotals(): void {
    this.totalSaved = this.jars.reduce(
      (sum, jar) => sum + this.getJarBudgetLimit(jar),
      0
    );
    this.totalSpent = this.jars.reduce(
      (sum, jar) => sum + this.getJarSpent(jar),
      0
    );
  }

  private getSelectedPeriodStartDate(): string {
    const range = this.getPeriodRange(this.budgetPeriod);
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

  private formatDateForRange(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  private formatCompactValue(value: number, fractionDigits = 1): string {
    const factor = Math.pow(10, fractionDigits);
    const rounded = Math.round(value * factor) / factor;
    const text = rounded.toFixed(fractionDigits);
    return text.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
  }
}
