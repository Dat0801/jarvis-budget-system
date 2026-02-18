import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { BudgetService, Budget } from '../../services/budget.service';
import { StatsService } from '../../services/stats.service';
import { ExpenseService } from '../../services/expense.service';
import { IncomeService } from '../../services/income.service';

interface Transaction {
  title: string;
  time: string;
  amount: number;
  type: 'credit' | 'debit';
  icon: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  jars: Budget[] = [];
  totalBalance = 0;
  userName = 'User';
  timeOfDay = 'evening';
  incomeTotal = 0;
  expenseTotal = 0;
  selectedCurrencyCode = 'VND';
  recentTransactions: Transaction[] = [];

  constructor(
    private budgetService: BudgetService,
    private statsService: StatsService,
    private expenseService: ExpenseService,
    private incomeService: IncomeService
  ) {}

  ngOnInit(): void {
    this.loadCurrencyPreference();
    this.updateTimeOfDay();
    this.loadSummary();
    this.loadStats();
    this.loadRecentTransactions();
  }

  ionViewWillEnter(): void {
    this.loadCurrencyPreference();
  }

  loadSummary(): void {
    this.budgetService.list().subscribe((jars) => {
      this.jars = jars;
      this.totalBalance = jars.reduce((sum, jar) => sum + Number(jar.balance), 0);
    });
  }

  loadStats(): void {
    this.statsService.getSummary().subscribe((summary) => {
      this.incomeTotal = summary.total_income;
      this.expenseTotal = summary.total_expenses;
    });
  }

  loadRecentTransactions(): void {
    // Load expenses and incomes and combine them
    this.expenseService.list().subscribe((expensesResponse: any) => {
      const expenses = (expensesResponse.data || []).slice(0, 3).map((expense: any) => ({
        title: expense.category || 'Expense',
        time: this.formatDate(expense.spent_at),
        amount: -Number(expense.amount),
        type: 'debit' as const,
        icon: 'wallet',
      }));

      this.incomeService.list().subscribe((incomesResponse: any) => {
        const incomes = (incomesResponse.data || []).slice(0, 3).map((income: any) => ({
          title: income.source || 'Income',
          time: this.formatDate(income.received_at),
          amount: Number(income.amount),
          type: 'credit' as const,
          icon: 'cash',
        }));

        this.recentTransactions = [...expenses, ...incomes]
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);
      });
    });
  }

  updateTimeOfDay(): void {
    const hours = new Date().getHours();
    if (hours < 12) {
      this.timeOfDay = 'morning';
      return;
    }
    if (hours < 18) {
      this.timeOfDay = 'afternoon';
      return;
    }
    this.timeOfDay = 'evening';
  }

  getJarProgress(jar: Budget): number {
    const balance = Number(jar.balance);
    if (!this.totalBalance || Number.isNaN(balance)) {
      return 0;
    }
    return Math.min(100, Math.max(0, (balance / this.totalBalance) * 100));
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

  private formatDate(date: string | null | undefined): string {
    if (!date) {
      return 'Today';
    }

    const transactionDate = new Date(date);
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
