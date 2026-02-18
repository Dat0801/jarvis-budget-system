import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Budget, BudgetService, Transaction } from '../../../services/budget.service';
import { formatVndAmountInput, parseVndAmount } from '../../../utils/vnd-amount.util';

export interface JarDetail extends Budget {
  target?: number;
  transactions?: Transaction[];
  avgDailySpend?: number;
  cycleRemaining?: number;
}

@Component({
  selector: 'app-jar-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './jar-detail.page.html',
  styleUrls: ['./jar-detail.page.scss'],
})
export class JarDetailPage implements OnInit {
  jar: JarDetail | null = null;
  transactions: Transaction[] = [];
  isAddMoneyOpen = false;
  isEditJarOpen = false;
  addAmount = '';
  editName = '';
  editDescription = '';
  jarId: number | null = null;
  parseFloat = parseFloat;

  constructor(
    private budgetService: BudgetService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.jarId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.jarId) {
      this.loadJarDetail();
    }
  }

  loadJarDetail(): void {
    if (!this.jarId) return;
    this.budgetService.detail(this.jarId).subscribe((jar: JarDetail) => {
      this.jar = jar;
      this.editName = jar.name;
      this.editDescription = jar.description || '';
      this.loadTransactions();
    });
  }

  loadTransactions(): void {
    if (!this.jarId) return;
    this.budgetService.getTransactions(this.jarId).subscribe((response) => {
      const transactions = response.data || [];
      this.transactions = transactions.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }

  getProgress(): number {
    if (!this.jar || !this.jar.target) return 0;
    return Math.min((parseFloat(this.jar.balance) / this.jar.target) * 100, 100);
  }

  getRemaining(): number {
    if (!this.jar || !this.jar.target) return 0;
    return Math.max(this.jar.target - parseFloat(this.jar.balance), 0);
  }

  formatCurrency(value: string | number): string {
    return parseFloat(value.toString()).toFixed(2);
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

  getRecentTransactions(): Transaction[] {
    return this.transactions.slice(0, 3);
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

  onAddAmountInput(event: CustomEvent): void {
    this.addAmount = formatVndAmountInput(event.detail?.value);
  }

  get canSubmitAddMoney(): boolean {
    const amount = parseVndAmount(this.addAmount);
    return amount !== null && amount > 0;
  }

  openEditJar(): void {
    this.isEditJarOpen = true;
  }

  closeEditJar(): void {
    this.isEditJarOpen = false;
  }

  submitEditJar(): void {
    if (!this.jarId || !this.editName) return;
    this.budgetService.update(this.jarId, {
      name: this.editName,
      description: this.editDescription || null,
    }).subscribe(() => {
      this.closeEditJar();
      this.loadJarDetail();
    });
  }

  goBack(): void {
    this.router.navigate(['/tabs/budgets']);
  }

  seeAllTransactions(): void {
    this.router.navigate(['/tabs/budgets', this.jarId, 'activity']);
  }
}
