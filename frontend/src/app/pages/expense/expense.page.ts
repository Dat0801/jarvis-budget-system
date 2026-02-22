import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ExpenseService } from '../../services/expense.service';
import { IncomeService } from '../../services/income.service';
import { Wallet, WalletService } from '../../services/wallet.service';
import { CategoryService, CategoryTreeNode, CategoryType } from '../../services/category.service';
import { formatVndAmountInput, parseVndAmount } from '../../utils/vnd-amount.util';
import { finalize, switchMap } from 'rxjs';
import { formatCurrencyAmount, getStoredCurrencyCode, normalizeCurrencyCode } from '../../utils/currency.util';

interface ExpenseItem {
  id: number;
  jar_id: number;
  amount: string;
  category?: string | null;
  note?: string | null;
  spent_at?: string | null;
  jar?: { name: string } | null;
}

interface PaginatedExpenseResponse {
  data: ExpenseItem[];
}

interface ExpenseCategoryOption {
  value: string;
  categoryName: string;
  subCategoryName?: string;
}

type TransactionTab = 'expense' | 'income' | 'debtLoan';

@Component({
  selector: 'app-expense',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './expense.page.html',
  styleUrls: ['./expense.page.scss'],
})
export class ExpensePage implements OnInit {
  segmentValue: TransactionTab = 'expense';
  currencyOptions = ['USD', 'VND', 'EUR'] as const;
  currency: (typeof this.currencyOptions)[number] = 'USD';
  selectedExpenseCategoryValue = '';
  amount = '';
  note = '';
  source = '';
  jarId: number | null = null;
  spentAt = this.getTodayDate();
  tempSpentAt = this.getTodayDate();
  receivedAt = this.getTodayDate();
  tempReceivedAt = this.getTodayDate();
  wallets: Wallet[] = [];
  expenseCategories: CategoryTreeNode[] = [];
  recentExpenses: ExpenseItem[] = [];
  isLoadingExpenses = false;
  isLoadingCategories = false;
  isLoadingJars = false;
  isDatePickerOpen = false;
  isSaving = false;
  isEditOpen = false;
  editId: number | null = null;
  editJarId: number | null = null;
  editAmount = '';
  editCategory = '';
  editNote = '';
  editSpentAt = '';

  isEditMode = false;
  editModeType: 'expense' | 'income' | null = null;
  editModeId: number | null = null;
  pendingCategoryName: string | null = null;

  constructor(
    private expenseService: ExpenseService,
    private incomeService: IncomeService,
    private walletService: WalletService,
    private categoryService: CategoryService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const savedCurrency = normalizeCurrencyCode(getStoredCurrencyCode());
    if (this.currencyOptions.some((option) => option === savedCurrency)) {
      this.currency = savedCurrency as (typeof this.currencyOptions)[number];
    }

    this.spentAt = this.spentAt || this.getTodayDate();
    this.receivedAt = this.receivedAt || this.getTodayDate();
    this.loadCategories();
    this.route.queryParamMap.subscribe((params) => {
      const mode = params.get('mode');
      const typeParam = params.get('type');
      const idParam = params.get('id');

      if (mode === 'edit' && (typeParam === 'income' || typeParam === 'expense') && idParam) {
        this.isEditMode = true;
        this.editModeType = typeParam;
        this.editModeId = Number(idParam);
        this.segmentValue = typeParam;
        this.loadEditTransaction();
      } else {
        this.isEditMode = false;
        this.editModeType = null;
        this.editModeId = null;

        const requestedTab = params.get('tab');
        if (requestedTab === 'income' || requestedTab === 'expense' || requestedTab === 'debtLoan') {
          this.segmentValue = requestedTab;
          this.loadCategories();
        }
      }

      const selectedCategory = params.get('selectedCategory');
      if (!selectedCategory) {
        return;
      }

      this.selectedExpenseCategoryValue = selectedCategory;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { selectedCategory: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
    this.loadWallets();
    this.loadExpenses();
  }

  loadWallets(): void {
    this.isLoadingJars = true;
    this.walletService.list().pipe(finalize(() => {
      this.isLoadingJars = false;
    })).subscribe((jars) => {
      this.wallets = jars;
      this.setDefaultWalletId();
    });
  }

  loadCategories(): void {
    this.isLoadingCategories = true;
    this.categoryService.getTree(this.getActiveCategoryType()).subscribe({
      next: (response) => {
        this.expenseCategories = response.data || [];
        this.isLoadingCategories = false;
        this.applyPendingCategorySelection();
      },
      error: () => {
        this.isLoadingCategories = false;
        this.expenseCategories = [];
      },
    });
  }

  onSegmentChange(event: CustomEvent): void {
    const value = event.detail?.value as TransactionTab | undefined;
    if (!value) {
      return;
    }

    this.segmentValue = value;
    this.resetFormForTabChange();
    this.loadCategories();
  }

  get expenseCategoryOptions(): ExpenseCategoryOption[] {
    const options: ExpenseCategoryOption[] = [];

    this.expenseCategories.forEach((category) => {
      options.push({
        value: `category:${category.id}`,
        categoryName: category.name,
      });

      category.children.forEach((subCategory) => {
        options.push({
          value: `sub:${subCategory.id}`,
          categoryName: category.name,
          subCategoryName: subCategory.name,
        });
      });
    });

    return options;
  }

  get selectedExpenseCategoryLabel(): string {
    const selected = this.expenseCategoryOptions.find(
      (option) => option.value === this.selectedExpenseCategoryValue
    );

    if (!selected) {
      return '';
    }

    return selected.subCategoryName || selected.categoryName;
  }

  get currencySymbol(): string {
    const symbolByCurrency: Record<(typeof this.currencyOptions)[number], string> = {
      USD: '$',
      VND: 'đ',
      EUR: '€',
    };
    return symbolByCurrency[this.currency];
  }

  get isIncomeTab(): boolean {
    return this.segmentValue === 'income';
  }

  get showCategorySelector(): boolean {
    return true;
  }

  get activeDateDisplay(): string {
    return this.formatDateWithWeekday(this.getActiveDateValue());
  }

  get activeTempDate(): string {
    if (this.segmentValue === 'income') {
      return this.tempReceivedAt;
    }

    return this.tempSpentAt;
  }

  get isSaveDisabled(): boolean {
    if (this.isSaving) {
      return true;
    }

    const parsedAmount = parseVndAmount(this.amount);
    if (!parsedAmount) {
      return true;
    }

    if (this.segmentValue === 'income') {
      return !this.selectedExpenseCategoryLabel;
    }

    return !this.selectedExpenseCategoryLabel;
  }

  get spentAtDisplay(): string {
    return this.formatDateWithWeekday(this.spentAt);
  }

  submit(): void {
    if (this.isSaving) {
      return;
    }

    const parsedAmount = parseVndAmount(this.amount);
    if (!parsedAmount) {
      return;
    }

    const selectedCategory = this.selectedExpenseCategoryLabel;
    if (!selectedCategory) {
      return;
    }

    if (this.isEditMode) {
      this.submitEditTransaction(parsedAmount, selectedCategory);
      return;
    }

    if (this.segmentValue === 'income') {
      this.isSaving = true;
      this.incomeService
        .create({
          jar_id: this.jarId || undefined,
          amount: parsedAmount,
          category: selectedCategory,
          source: this.source || undefined,
          received_at: this.receivedAt || undefined,
        })
        .pipe(
          finalize(() => {
            this.isSaving = false;
          })
        )
        .subscribe(() => {
          this.router.navigateByUrl('/tabs/transactions');
        });

      return;
    }

    this.isSaving = true;
    this.expenseService
      .create({
        jar_id: this.jarId || undefined,
        amount: parsedAmount,
        category: selectedCategory,
        note: this.note || undefined,
        spent_at: this.spentAt || undefined,
      })
      .pipe(
        finalize(() => {
          this.isSaving = false;
        })
      )
      .subscribe(() => {
        this.router.navigateByUrl('/tabs/transactions');
      });
  }

  openCategorySelector(): void {
    this.router.navigate(['/tabs/categories'], {
      queryParams: {
        selectMode: '1',
        type: this.segmentValue === 'income' ? 'income' : this.segmentValue === 'debtLoan' ? 'debtLoan' : 'expense',
        returnUrl: '/expense',
      },
    });
  }

  openDatePicker(): void {
    if (this.segmentValue === 'income') {
      this.tempReceivedAt = this.receivedAt || this.getTodayDate();
    } else {
      this.tempSpentAt = this.spentAt || this.getTodayDate();
    }
    this.isDatePickerOpen = true;
  }

  closeDatePicker(): void {
    this.isDatePickerOpen = false;
  }

  onDateValueChange(event: CustomEvent): void {
    const value = event.detail?.value;
    if (typeof value === 'string' && value.length > 0) {
      if (this.segmentValue === 'income') {
        this.tempReceivedAt = this.normalizeDateValue(value);
      } else {
        this.tempSpentAt = this.normalizeDateValue(value);
      }
    }
  }

  confirmDatePicker(): void {
    if (this.segmentValue === 'income') {
      this.receivedAt = this.normalizeDateValue(this.tempReceivedAt || this.getTodayDate());
    } else {
      this.spentAt = this.normalizeDateValue(this.tempSpentAt || this.getTodayDate());
    }
    this.closeDatePicker();
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private normalizeDateValue(value: string): string {
    return value.split('T')[0];
  }

  private getActiveDateValue(): string {
    if (this.segmentValue === 'income') {
      return this.receivedAt;
    }

    return this.spentAt;
  }

  private getActiveCategoryType(): CategoryType {
    if (this.segmentValue === 'income') {
      return 'income';
    }

    if (this.segmentValue === 'debtLoan') {
      return 'debt_loan';
    }

    return 'expense';
  }

  private resetFormForTabChange(): void {
    this.selectedExpenseCategoryValue = '';
    this.note = '';
    this.source = '';
    this.spentAt = this.getTodayDate();
    this.receivedAt = this.getTodayDate();
    this.tempSpentAt = this.spentAt;
    this.tempReceivedAt = this.receivedAt;
    this.setDefaultWalletId();
  }

  private formatDateWithWeekday(value: string): string {
    if (!value) {
      return '';
    }

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  onAmountChange(value: string | number | null | undefined): void {
    this.amount = String(value ?? '').replace(/\D+/g, '');
  }

  onAmountBlur(): void {
    this.amount = formatVndAmountInput(this.amount);
  }

  loadExpenses(): void {
    this.isLoadingExpenses = true;
    this.expenseService.list().pipe(finalize(() => {
      this.isLoadingExpenses = false;
    })).subscribe((response: unknown) => {
      const paginated = response as PaginatedExpenseResponse;
      this.recentExpenses = (paginated.data || []).slice(0, 8);
    });
  }

  openEditExpense(expense: ExpenseItem): void {
    this.editId = expense.id;
    this.editJarId = expense.jar_id;
    this.editAmount = formatVndAmountInput(expense.amount);
    this.editCategory = expense.category || '';
    this.editNote = expense.note || '';
    this.editSpentAt = expense.spent_at || '';
    this.isEditOpen = true;
  }

  closeEditExpense(): void {
    this.isEditOpen = false;
    this.editId = null;
    this.editJarId = null;
    this.editAmount = '';
    this.editCategory = '';
    this.editNote = '';
    this.editSpentAt = '';
  }

  submitEditExpense(): void {
    const parsedAmount = parseVndAmount(this.editAmount);
    if (!this.editId || !this.editJarId || !parsedAmount) {
      return;
    }

    this.expenseService.update(this.editId, {
      jar_id: this.editJarId,
      amount: parsedAmount,
      category: this.editCategory || undefined,
      note: this.editNote || undefined,
      spent_at: this.editSpentAt || undefined,
    }).subscribe(() => {
      this.closeEditExpense();
      this.loadExpenses();
      this.loadWallets();
    });
  }

  onEditAmountInput(event: CustomEvent): void {
    this.editAmount = formatVndAmountInput(event.detail?.value);
  }

  deleteExpense(id: number): void {
    this.expenseService.remove(id).subscribe(() => {
      this.loadExpenses();
      this.loadWallets();
    });
  }

  private setDefaultWalletId(): void {
    if (this.jarId && this.wallets.some((wallet) => wallet.id === this.jarId)) {
      return;
    }

    const cashWallet = this.wallets.find(
      (wallet) => wallet.name.trim().toLowerCase() === 'cash'
    );

    if (cashWallet) {
      this.jarId = cashWallet.id;
      return;
    }

    this.jarId = this.wallets.length > 0 ? this.wallets[0].id : null;
  }

  formatCurrency(value: string): string {
    const amount = Number.parseFloat(value);
    if (Number.isNaN(amount)) {
      return formatCurrencyAmount(0, getStoredCurrencyCode());
    }
    return formatCurrencyAmount(amount, getStoredCurrencyCode());
  }

  private loadEditTransaction(): void {
    if (!this.editModeId || !this.editModeType) {
      return;
    }

    if (this.editModeType === 'expense') {
      this.expenseService.detail(this.editModeId).subscribe((response: unknown) => {
        const data = response as any;
        const expense = (data && typeof data === 'object' && 'data' in data ? data.data : data) as ExpenseItem;
        this.jarId = expense.jar_id || null;
        this.amount = formatVndAmountInput(expense.amount);
        this.note = expense.note || '';
        this.spentAt = this.normalizeDateValue(expense.spent_at || this.getTodayDate());
        this.pendingCategoryName = expense.category || null;
        this.applyPendingCategorySelection();
      });
      return;
    }

    this.incomeService.detail(this.editModeId).subscribe((response: unknown) => {
      const data = response as any;
      const income = (data && typeof data === 'object' && 'data' in data ? data.data : data) as {
        id: number;
        jar_id?: number | null;
        amount: string;
        category?: string | null;
        source?: string | null;
        received_at?: string | null;
      };
      this.jarId = income.jar_id || null;
        this.amount = formatVndAmountInput(income.amount);
      this.source = income.source || '';
        this.receivedAt = this.normalizeDateValue(income.received_at || this.getTodayDate());
      this.pendingCategoryName = income.category || null;
      this.applyPendingCategorySelection();
    });
  }

  private applyPendingCategorySelection(): void {
    if (!this.pendingCategoryName) {
      return;
    }
    const normalized = this.pendingCategoryName.trim().toLowerCase();
    const match = this.expenseCategoryOptions.find((option) => {
      const label = (option.subCategoryName || option.categoryName).trim().toLowerCase();
      return label === normalized;
    });
    if (match) {
      this.selectedExpenseCategoryValue = match.value;
      this.pendingCategoryName = null;
    }
  }

  private submitEditTransaction(parsedAmount: number, selectedCategory: string): void {
    if (!this.editModeId || !this.editModeType) {
      return;
    }

    if (this.editModeType === 'income') {
      this.isSaving = true;
      const jarId = this.jarId || undefined;
      const source = this.source || undefined;
      const receivedAt = this.receivedAt || undefined;

      this.incomeService
        .remove(this.editModeId)
        .pipe(
          switchMap(() =>
            this.incomeService.create({
              jar_id: jarId,
              amount: parsedAmount,
              category: selectedCategory,
              source,
              received_at: receivedAt,
            })
          ),
          finalize(() => {
            this.isSaving = false;
          })
        )
        .subscribe(() => {
          this.router.navigateByUrl('/tabs/transactions');
        });
      return;
    }

    this.isSaving = true;
    this.expenseService
      .update(this.editModeId, {
        jar_id: this.jarId || undefined,
        amount: parsedAmount,
        category: selectedCategory,
        note: this.note || undefined,
        spent_at: this.spentAt || undefined,
      })
      .pipe(
        finalize(() => {
          this.isSaving = false;
        })
      )
      .subscribe(() => {
        this.router.navigateByUrl('/tabs/transactions');
      });
  }
}
