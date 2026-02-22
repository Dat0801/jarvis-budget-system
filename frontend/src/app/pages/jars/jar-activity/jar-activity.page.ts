import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Budget, BudgetService, Transaction } from '../../../services/budget.service';
import { finalize } from 'rxjs';
import { formatCurrencyAmount, getStoredCurrencyCode } from '../../../utils/currency.util';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';

interface MonthTab {
  key: string;
  label: string;
  year: number;
  month: number;
}

@Component({
  selector: 'app-jar-activity',
  standalone: true,
  imports: [CommonModule, IonicModule, PageHeaderComponent],
  templateUrl: './jar-activity.page.html',
  styleUrls: ['./jar-activity.page.scss'],
})
export class JarActivityPage implements OnInit {
  jar: Budget | null = null;
  transactions: Transaction[] = [];
  monthTabs: MonthTab[] = [];
  selectedMonthKey = '';
  filteredTransactions: Transaction[] = [];
  inflowTransactions: Transaction[] = [];
  outflowTransactions: Transaction[] = [];
  isLoadingTransactions = false;
  jarId: number | null = null;

  constructor(
    private budgetService: BudgetService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.jarId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.jarId) {
      this.loadJarDetail();
      this.loadTransactions();
    }
  }

  loadJarDetail(): void {
    if (!this.jarId) return;
    this.budgetService.detail(this.jarId).subscribe((jar: Budget) => {
      this.jar = jar;
    });
  }

  loadTransactions(): void {
    if (!this.jarId) return;
    this.isLoadingTransactions = true;
    this.budgetService.getTransactions(this.jarId).pipe(finalize(() => {
      this.isLoadingTransactions = false;
    })).subscribe((response) => {
      const transactions = response.data || [];
      this.transactions = transactions.sort(
        (a, b) => this.resolveTransactionDate(b).getTime() - this.resolveTransactionDate(a).getTime()
      );

      this.buildMonthTabs();
      if (!this.selectedMonthKey) {
        this.selectedMonthKey = this.getMonthKey(new Date());
      }
      this.applySelectedMonth();
    });
  }

  onMonthChange(event: CustomEvent): void {
    const nextMonthKey = (event.detail?.value || '').toString();
    this.selectedMonthKey = nextMonthKey;
    this.applySelectedMonth();
  }

  trackByMonth(_index: number, tab: MonthTab): string {
    return tab.key;
  }

  trackByTransaction(_index: number, transaction: Transaction): number {
    return transaction.id;
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

  getTransactionTime(transaction: Transaction): string {
    return this.resolveTransactionDate(transaction).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatCurrency(value: string | number): string {
    const normalized = value.toString().replace(/[^0-9.-]+/g, '');
    const amount = Number.parseFloat(normalized);
    return formatCurrencyAmount(Number.isFinite(amount) ? amount : 0, getStoredCurrencyCode());
  }

  goBack(): void {
    this.router.navigate(['/tabs/budgets']);
  }

  private buildMonthTabs(): void {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const tabs: MonthTab[] = [
      {
        key: this.getMonthKey(thisMonth),
        label: 'This month',
        year: thisMonth.getFullYear(),
        month: thisMonth.getMonth(),
      },
      {
        key: this.getMonthKey(lastMonth),
        label: 'Last month',
        year: lastMonth.getFullYear(),
        month: lastMonth.getMonth(),
      },
    ];

    let oldestTransactionMonth: Date | null = null;
    if (this.transactions.length > 0) {
      const oldestTransaction = this.transactions[this.transactions.length - 1];
      const oldestDate = this.resolveTransactionDate(oldestTransaction);
      oldestTransactionMonth = new Date(oldestDate.getFullYear(), oldestDate.getMonth(), 1);
    }

    if (oldestTransactionMonth && oldestTransactionMonth.getTime() < lastMonth.getTime()) {
      let cursor = new Date(lastMonth.getFullYear(), lastMonth.getMonth() - 1, 1);

      while (cursor.getTime() >= oldestTransactionMonth.getTime()) {
        tabs.push({
          key: this.getMonthKey(cursor),
          label: this.formatOlderMonthLabel(cursor),
          year: cursor.getFullYear(),
          month: cursor.getMonth(),
        });

        cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
      }
    }

    this.monthTabs = tabs;
  }

  private applySelectedMonth(): void {
    const activeTab = this.monthTabs.find((tab) => tab.key === this.selectedMonthKey);
    if (!activeTab) {
      this.filteredTransactions = [];
      this.inflowTransactions = [];
      this.outflowTransactions = [];
      return;
    }

    const selectedTransactions = this.transactions.filter((transaction) => {
      const transactionDate = this.resolveTransactionDate(transaction);
      return (
        transactionDate.getFullYear() === activeTab.year
        && transactionDate.getMonth() === activeTab.month
      );
    });

    this.filteredTransactions = selectedTransactions;
    this.inflowTransactions = selectedTransactions.filter((transaction) => transaction.type === 'income');
    this.outflowTransactions = selectedTransactions.filter((transaction) => transaction.type === 'expense');
  }

  private resolveTransactionDate(transaction: Transaction): Date {
    const rawDate = transaction.received_at || transaction.spent_at || transaction.created_at;
    const parsed = new Date(rawDate);
    return Number.isNaN(parsed.getTime()) ? new Date(transaction.created_at) : parsed;
  }

  private getMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private formatOlderMonthLabel(date: Date): string {
    return date.toLocaleDateString('vi-VN', {
      month: '2-digit',
      year: 'numeric',
    });
  }
}
