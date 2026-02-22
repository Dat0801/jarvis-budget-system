import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { ExpenseService } from '../services/expense.service';
import { IncomeService } from '../services/income.service';
import { formatCurrencyAmount, getStoredCurrencyCode } from '../utils/currency.util';

type TransactionType = 'income' | 'expense';

interface ExpenseDetail {
  id: number;
  jar_id?: number | null;
  amount: string;
  category?: string | null;
  note?: string | null;
  spent_at?: string | null;
  created_at?: string | null;
  jar?: { name: string } | null;
}

interface IncomeDetail {
  id: number;
  jar_id?: number | null;
  amount: string;
  category?: string | null;
  source?: string | null;
  received_at?: string | null;
  created_at?: string | null;
  jar?: { name: string } | null;
}

interface TransactionDetailView {
  id: number;
  type: TransactionType;
  category: string;
  amount: number;
  date: Date;
  walletName: string;
  note?: string;
  source?: string;
}

@Component({
  selector: 'app-transaction-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, IonicModule],
  templateUrl: './transaction-detail.page.html',
  styleUrls: ['./transaction-detail.page.scss'],
})
export class TransactionDetailPage implements OnInit {
  isLoading = true;
  isProcessing = false;
  error: string | null = null;

  detail: TransactionDetailView | null = null;
  private type: TransactionType | null = null;
  private transactionId: number | null = null;
  private expenseRaw: ExpenseDetail | null = null;
  private incomeRaw: IncomeDetail | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private expenseService: ExpenseService,
    private incomeService: IncomeService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const typeParam = params.get('type');
      const idParam = params.get('id');

      if (!typeParam || !idParam) {
        this.error = 'Transaction not found';
        this.isLoading = false;
        return;
      }

      if (typeParam !== 'income' && typeParam !== 'expense') {
        this.error = 'Unsupported transaction type';
        this.isLoading = false;
        return;
      }

      const id = Number(idParam);
      if (!Number.isFinite(id)) {
        this.error = 'Invalid transaction id';
        this.isLoading = false;
        return;
      }

      this.type = typeParam;
      this.transactionId = id;
      this.loadTransaction();
    });
  }

  get isIncome(): boolean {
    return this.detail?.type === 'income';
  }

  get isExpense(): boolean {
    return this.detail?.type === 'expense';
  }

  formatCurrency(amount: number): string {
    return formatCurrencyAmount(amount, getStoredCurrencyCode());
  }

  duplicateTransaction(): void {
    if (!this.detail || !this.type || !this.transactionId) {
      return;
    }

    this.isProcessing = true;
    if (this.type === 'expense' && this.expenseRaw) {
      const amount = this.parseAmount(this.expenseRaw.amount);
      if (!amount) {
        this.isProcessing = false;
        return;
      }

      this.expenseService
        .create({
          jar_id: this.expenseRaw.jar_id || undefined,
          amount,
          category: this.expenseRaw.category || undefined,
          note: this.expenseRaw.note || undefined,
          spent_at: this.expenseRaw.spent_at || undefined,
        })
        .subscribe({
          next: () => {
            this.isProcessing = false;
            this.router.navigate(['/tabs/transactions']);
          },
          error: () => {
            this.isProcessing = false;
          },
        });
      return;
    }

    if (this.type === 'income' && this.incomeRaw) {
      const amount = this.parseAmount(this.incomeRaw.amount);
      if (!amount) {
        this.isProcessing = false;
        return;
      }

      this.incomeService
        .create({
          jar_id: this.incomeRaw.jar_id || undefined,
          amount,
          category: this.incomeRaw.category || undefined,
          source: this.incomeRaw.source || undefined,
          received_at: this.incomeRaw.received_at || undefined,
        })
        .subscribe({
          next: () => {
            this.isProcessing = false;
            this.router.navigate(['/tabs/transactions']);
          },
          error: () => {
            this.isProcessing = false;
          },
        });
    }
  }

  editTransaction(): void {
    if (!this.detail) {
      return;
    }

    this.router.navigate(['/expense'], {
      queryParams: {
        mode: 'edit',
        type: this.detail.type,
        id: this.detail.id,
      },
    });
  }

  deleteTransaction(): void {
    if (!this.type || !this.transactionId) {
      return;
    }

    this.isProcessing = true;

    if (this.type === 'expense') {
      this.expenseService.remove(this.transactionId).subscribe({
        next: () => {
          this.isProcessing = false;
          this.router.navigate(['/tabs/transactions']);
        },
        error: () => {
          this.isProcessing = false;
        },
      });
      return;
    }

    this.incomeService.remove(this.transactionId).subscribe({
      next: () => {
        this.isProcessing = false;
        this.router.navigate(['/tabs/transactions']);
      },
      error: () => {
        this.isProcessing = false;
      },
    });
  }

  private loadTransaction(): void {
    if (!this.type || !this.transactionId) {
      this.error = 'Transaction not found';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.error = null;

    if (this.type === 'expense') {
      this.expenseService.detail(this.transactionId).subscribe({
        next: (response: unknown) => {
          const expense = this.unwrapExpense(response);
          this.expenseRaw = expense;
          this.detail = this.mapExpenseToView(expense);
          this.isLoading = false;
        },
        error: () => {
          this.error = 'Failed to load transaction';
          this.isLoading = false;
        },
      });
      return;
    }

    this.incomeService.detail(this.transactionId).subscribe({
      next: (response: unknown) => {
        const income = this.unwrapIncome(response);
        this.incomeRaw = income;
        this.detail = this.mapIncomeToView(income);
        this.isLoading = false;
      },
      error: () => {
        this.error = 'Failed to load transaction';
        this.isLoading = false;
      },
    });
  }

  private unwrapExpense(response: unknown): ExpenseDetail {
    const data = response as any;
    if (data && typeof data === 'object' && 'data' in data) {
      return data.data as ExpenseDetail;
    }
    return data as ExpenseDetail;
  }

  private unwrapIncome(response: unknown): IncomeDetail {
    const data = response as any;
    if (data && typeof data === 'object' && 'data' in data) {
      return data.data as IncomeDetail;
    }
    return data as IncomeDetail;
  }

  private mapExpenseToView(expense: ExpenseDetail): TransactionDetailView {
    const amount = this.parseAmount(expense.amount);
    const date = this.parseDate(expense.spent_at || expense.created_at);
    return {
      id: expense.id,
      type: 'expense',
      category: expense.category || 'Expense',
      amount,
      date,
      walletName: expense.jar?.name || 'Wallet',
      note: expense.note || undefined,
    };
  }

  private mapIncomeToView(income: IncomeDetail): TransactionDetailView {
    const amount = this.parseAmount(income.amount);
    const date = this.parseDate(income.received_at || income.created_at);
    return {
      id: income.id,
      type: 'income',
      category: income.category || 'Income',
      amount,
      date,
      walletName: income.jar?.name || 'Wallet',
      source: income.source || undefined,
    };
  }

  private parseAmount(value: string | number | null | undefined): number {
    if (typeof value === 'number') {
      return value;
    }
    if (!value) {
      return 0;
    }
    const parsed = Number.parseFloat(value.toString());
    if (Number.isNaN(parsed)) {
      return 0;
    }
    return Math.abs(parsed);
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
}
