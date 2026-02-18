import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { forkJoin } from 'rxjs';
import { BudgetService, Budget } from '../../services/budget.service';
import { ExpenseService } from '../../services/expense.service';
import { IncomeService } from '../../services/income.service';

interface Transaction {
  id: number;
  jarId: number | null;
  jarName: string;
  title: string;
  note: string;
  timeLabel: string;
  date: Date;
  amount: number;
  type: 'income' | 'expense';
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  jars: Budget[] = [];
  totalWalletBalance = 0;
  selectedCurrencyCode = 'VND';
  allTransactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  searchTerm = '';

  monthLabel = '';
  monthlyTransactionTotal = 0;
  monthlyIncomeTotal = 0;
  monthlyExpenseTotal = 0;

  incomeBarHeight = 0;
  expenseBarHeight = 0;

  constructor(
    private budgetService: BudgetService,
    private expenseService: ExpenseService,
    private incomeService: IncomeService
  ) {}

  ngOnInit(): void {
    this.loadCurrencyPreference();
    this.monthLabel = this.getCurrentMonthLabel();
    this.loadDashboardData();
  }

  ionViewWillEnter(): void {
    this.loadCurrencyPreference();
    this.loadDashboardData();
  }

  onSearchChange(event: CustomEvent): void {
    this.searchTerm = (event.detail.value || '').toString();
    this.applyTransactionSearch();
  }

  getWalletProgress(jar: Budget): number {
    const balance = Number(jar.balance);
    if (!this.totalWalletBalance || Number.isNaN(balance)) {
      return 0;
    }
    return Math.min(100, Math.max(0, (balance / this.totalWalletBalance) * 100));
  }

  trackByTransactionId(_index: number, transaction: Transaction): number {
    return transaction.id;
  }

  private loadDashboardData(): void {
    forkJoin({
      jars: this.budgetService.list(),
      expensesResponse: this.expenseService.list(),
      incomesResponse: this.incomeService.list(),
    }).subscribe(({ jars, expensesResponse, incomesResponse }) => {
      this.jars = Array.isArray(jars) ? jars : [];
      this.totalWalletBalance = this.jars.reduce((sum, jar) => sum + Number(jar.balance), 0);

      const jarNameById = this.jars.reduce<Record<number, string>>((accumulator, jar) => {
        accumulator[jar.id] = jar.name;
        return accumulator;
      }, {});

      const expenses = this.extractList(expensesResponse).map((expense: any) => {
        const transactionDate = this.parseDate(expense.spent_at || expense.created_at);
        return {
          id: Number(expense.id),
          jarId: expense.jar_id ?? null,
          jarName: jarNameById[Number(expense.jar_id)] || 'Wallet',
          title: expense.category || 'Expense',
          note: expense.note || '',
          timeLabel: this.formatDateLabel(transactionDate),
          date: transactionDate,
          amount: -Math.abs(Number(expense.amount) || 0),
          type: 'expense' as const,
          icon: 'arrow-up-outline',
        };
      });

      const incomes = this.extractList(incomesResponse).map((income: any) => {
        const transactionDate = this.parseDate(income.received_at || income.created_at);
        return {
          id: Number(income.id),
          jarId: income.jar_id ?? null,
          jarName: jarNameById[Number(income.jar_id)] || 'Wallet',
          title: income.source || 'Income',
          note: '',
          timeLabel: this.formatDateLabel(transactionDate),
          date: transactionDate,
          amount: Math.abs(Number(income.amount) || 0),
          type: 'income' as const,
          icon: 'arrow-down-outline',
        };
      });

      this.allTransactions = [...expenses, ...incomes].sort(
        (first, second) => second.date.getTime() - first.date.getTime()
      );

      this.calculateMonthlyTotals();
      this.applyTransactionSearch();
    });
  }

  private calculateMonthlyTotals(): void {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const currentMonthTransactions = this.allTransactions.filter((transaction) => {
      const txDate = transaction.date;
      return txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth;
    });

    this.monthlyIncomeTotal = currentMonthTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

    this.monthlyExpenseTotal = currentMonthTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

    this.monthlyTransactionTotal = currentMonthTransactions
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

    const maxValue = Math.max(this.monthlyIncomeTotal, this.monthlyExpenseTotal, 1);
    this.incomeBarHeight = (this.monthlyIncomeTotal / maxValue) * 100;
    this.expenseBarHeight = (this.monthlyExpenseTotal / maxValue) * 100;
  }

  private applyTransactionSearch(): void {
    const keyword = this.searchTerm.trim().toLowerCase();

    if (!keyword) {
      this.filteredTransactions = this.allTransactions.slice(0, 8);
      return;
    }

    this.filteredTransactions = this.allTransactions
      .filter((transaction) => {
        const haystack = [
          transaction.title,
          transaction.note,
          transaction.jarName,
          transaction.timeLabel,
        ]
          .join(' ')
          .toLowerCase();

        return haystack.includes(keyword);
      })
      .slice(0, 12);
  }

  private getCurrentMonthLabel(): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }

  private extractList(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }
    return Array.isArray(response?.data) ? response.data : [];
  }

  private parseDate(value: string | null | undefined): Date {
    if (!value) {
      return new Date();
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }

    return parsed;
  }

  private loadCurrencyPreference(): void {
    const savedCurrency = localStorage.getItem('currency');

    if (!savedCurrency) {
      this.selectedCurrencyCode = 'VND';
      return;
    }

    const [currencyCode] = savedCurrency.split(' ');
    this.selectedCurrencyCode = currencyCode || 'VND';
  }

  private formatDateLabel(transactionDate: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (transactionDate.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (transactionDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return transactionDate.toLocaleDateString();
  }
}
