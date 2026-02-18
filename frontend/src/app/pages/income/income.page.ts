import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { IncomeService } from '../../services/income.service';
import { Budget, BudgetService } from '../../services/budget.service';
import { formatVndAmountInput, parseVndAmount } from '../../utils/vnd-amount.util';

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
  jarId: number | null = null;
  amount = '';
  source = '';
  receivedAt = '';
  jars: Budget[] = [];
  recentIncomes: IncomeItem[] = [];
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
    this.loadJars();
    this.loadIncomes();
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
        this.receivedAt = '';
        this.loadIncomes();
        this.loadJars();
      });
  }

  onAmountInput(event: CustomEvent): void {
    this.amount = formatVndAmountInput(event.detail?.value);
  }

  loadIncomes(): void {
    this.incomeService.list().subscribe((response: unknown) => {
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
      return '₫0';
    }
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
