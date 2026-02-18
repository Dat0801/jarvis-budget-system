import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ExpenseService } from '../../services/expense.service';
import { Budget, BudgetService } from '../../services/budget.service';
import { formatVndAmountInput, parseVndAmount } from '../../utils/vnd-amount.util';

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

@Component({
  selector: 'app-expense',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './expense.page.html',
  styleUrls: ['./expense.page.scss'],
})
export class ExpensePage implements OnInit {
  segmentValue: 'income' | 'expense' = 'expense';
  jarId: number | null = null;
  amount = '';
  category = '';
  note = '';
  spentAt = '';
  jars: Budget[] = [];
  recentExpenses: ExpenseItem[] = [];
  isEditOpen = false;
  editId: number | null = null;
  editJarId: number | null = null;
  editAmount = '';
  editCategory = '';
  editNote = '';
  editSpentAt = '';

  constructor(
    private expenseService: ExpenseService,
    private budgetService: BudgetService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadJars();
    this.loadExpenses();
  }

  loadJars(): void {
    this.budgetService.list().subscribe((jars) => {
      this.jars = jars;
      if (!this.jarId && jars.length > 0) {
        this.jarId = jars[0].id;
      }
    });
  }

  onSegmentChange(event: CustomEvent): void {
    const value = event.detail?.value as 'income' | 'expense' | undefined;
    if (value === 'income') {
      this.router.navigateByUrl('/income');
    }
  }

  get selectedJar(): Budget | undefined {
    return this.jars.find((jar) => jar.id === this.jarId);
  }

  get jarBalance(): number | null {
    if (!this.selectedJar) {
      return null;
    }
    const parsed = Number.parseFloat(this.selectedJar.balance);
    return Number.isNaN(parsed) ? null : parsed;
  }

  get showInsufficientBalance(): boolean {
    const enteredAmount = parseVndAmount(this.amount);
    if (!enteredAmount || !this.jarBalance) {
      return false;
    }
    return enteredAmount > this.jarBalance;
  }

  get remainingBalanceText(): string {
    const enteredAmount = parseVndAmount(this.amount);
    if (!this.jarBalance || !enteredAmount) {
      return '$0.00';
    }
    const remaining = Math.max(this.jarBalance - enteredAmount, 0);
    return `$${remaining.toFixed(2)}`;
  }

  submit(): void {
    const parsedAmount = parseVndAmount(this.amount);
    if (!this.jarId || !parsedAmount) {
      return;
    }

    this.expenseService
      .create({
        jar_id: this.jarId,
        amount: parsedAmount,
        category: this.category || undefined,
        note: this.note || undefined,
        spent_at: this.spentAt || undefined,
      })
      .subscribe(() => {
        this.jarId = null;
        this.amount = '';
        this.category = '';
        this.note = '';
        this.spentAt = '';
        this.loadExpenses();
        this.loadJars();
      });
  }

  onAmountInput(event: CustomEvent): void {
    this.amount = formatVndAmountInput(event.detail?.value);
  }

  loadExpenses(): void {
    this.expenseService.list().subscribe((response: unknown) => {
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
      this.loadJars();
    });
  }

  onEditAmountInput(event: CustomEvent): void {
    this.editAmount = formatVndAmountInput(event.detail?.value);
  }

  deleteExpense(id: number): void {
    this.expenseService.remove(id).subscribe(() => {
      this.loadExpenses();
      this.loadJars();
    });
  }

  formatCurrency(value: string): string {
    const amount = Number.parseFloat(value);
    if (Number.isNaN(amount)) {
      return '₫0';
    }
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
