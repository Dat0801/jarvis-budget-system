import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IncomeService } from '../../services/income.service';
import { Budget, BudgetService } from '../../services/budget.service';
import { formatVndAmountInput, parseVndAmount } from '../../utils/vnd-amount.util';
import { finalize } from 'rxjs';
import { formatCurrencyAmount, getStoredCurrencyCode, normalizeCurrencyCode } from '../../utils/currency.util';

interface IncomeItem {
  id: number;
  amount: string;
  source?: string | null;
  received_at?: string | null;
  jar?: { name: string } | null;
}

interface PaginatedIncomeResponse {
  data: IncomeItem[];
}

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './income.page.html',
  styleUrls: ['./income.page.scss'],
})
export class IncomePage implements OnInit {
  segmentValue: 'income' | 'expense' = 'income';
  currencyOptions = ['USD', 'VND', 'EUR'] as const;
  currency: (typeof this.currencyOptions)[number] = 'USD';
  jarId: number | null = null;
  amount = '';
  source = '';
  receivedAt = this.getTodayDate();
  tempReceivedAt = this.getTodayDate();
  jars: Budget[] = [];
  recentIncomes: IncomeItem[] = [];
  isLoadingIncomes = false;
  isLoadingJars = false;
  isDatePickerOpen = false;
  isEditOpen = false;
  editId: number | null = null;
  editSource = '';
  editReceivedAt = '';

  constructor(
    private incomeService: IncomeService,
    private budgetService: BudgetService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const savedCurrency = normalizeCurrencyCode(getStoredCurrencyCode());
    if (this.currencyOptions.some((option) => option === savedCurrency)) {
      this.currency = savedCurrency as (typeof this.currencyOptions)[number];
    }

    this.receivedAt = this.receivedAt || this.getTodayDate();
    this.loadJars();
    this.loadIncomes();
  }

  get currencySymbol(): string {
    const symbolByCurrency: Record<(typeof this.currencyOptions)[number], string> = {
      USD: '$',
      VND: 'VNĐ',
      EUR: '€',
    };
    return symbolByCurrency[this.currency];
  }

  get receivedAtDisplay(): string {
    return this.formatDateWithWeekday(this.receivedAt);
  }

  loadJars(): void {
    this.isLoadingJars = true;
    this.budgetService.list().pipe(finalize(() => {
      this.isLoadingJars = false;
    })).subscribe((jars) => {
      this.jars = jars;
      if (!this.jarId && jars.length > 0) {
        this.jarId = jars[0].id;
      }
    });
  }

  onSegmentChange(event: CustomEvent): void {
    const value = event.detail?.value as 'income' | 'expense' | undefined;
    if (value === 'expense') {
      this.router.navigateByUrl('/expense');
    }
  }

  submit(): void {
    const parsedAmount = parseVndAmount(this.amount);
    if (!this.jarId || !parsedAmount) {
      return;
    }

    this.incomeService
      .create({
        jar_id: this.jarId,
        amount: parsedAmount,
        source: this.source || undefined,
        received_at: this.receivedAt || undefined,
      })
      .subscribe(() => {
        this.jarId = null;
        this.amount = '';
        this.source = '';
        this.receivedAt = this.getTodayDate();
        this.loadIncomes();
        this.loadJars();
      });
  }

  openDatePicker(): void {
    this.tempReceivedAt = this.receivedAt || this.getTodayDate();
    this.isDatePickerOpen = true;
  }

  closeDatePicker(): void {
    this.isDatePickerOpen = false;
  }

  onDateValueChange(event: CustomEvent): void {
    const value = event.detail?.value;
    if (typeof value === 'string' && value.length > 0) {
      this.tempReceivedAt = this.normalizeDateValue(value);
    }
  }

  confirmDatePicker(): void {
    this.receivedAt = this.normalizeDateValue(this.tempReceivedAt || this.getTodayDate());
    this.closeDatePicker();
  }

  onAmountInput(event: CustomEvent): void {
    this.amount = formatVndAmountInput(event.detail?.value);
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private normalizeDateValue(value: string): string {
    return value.split('T')[0];
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

  loadIncomes(): void {
    this.isLoadingIncomes = true;
    this.incomeService.list().pipe(finalize(() => {
      this.isLoadingIncomes = false;
    })).subscribe((response: unknown) => {
      const paginated = response as PaginatedIncomeResponse;
      this.recentIncomes = (paginated.data || []).slice(0, 8);
    });
  }

  openEditIncome(income: IncomeItem): void {
    this.editId = income.id;
    this.editSource = income.source || '';
    this.editReceivedAt = income.received_at || '';
    this.isEditOpen = true;
  }

  closeEditIncome(): void {
    this.isEditOpen = false;
    this.editId = null;
    this.editSource = '';
    this.editReceivedAt = '';
  }

  submitEditIncome(): void {
    if (!this.editId) {
      return;
    }

    this.incomeService.update(this.editId, {
      source: this.editSource || undefined,
      received_at: this.editReceivedAt || undefined,
    }).subscribe(() => {
      this.closeEditIncome();
      this.loadIncomes();
    });
  }

  deleteIncome(id: number): void {
    this.incomeService.remove(id).subscribe(() => {
      this.loadIncomes();
      this.loadJars();
    });
  }

  formatCurrency(value: string): string {
    const amount = Number.parseFloat(value);
    if (Number.isNaN(amount)) {
      return formatCurrencyAmount(0, getStoredCurrencyCode());
    }
    return formatCurrencyAmount(amount, getStoredCurrencyCode());
  }
}
