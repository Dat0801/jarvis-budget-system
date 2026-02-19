import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Budget, BudgetService, Transaction } from '../../../services/budget.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-jar-activity',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './jar-activity.page.html',
  styleUrls: ['./jar-activity.page.scss'],
})
export class JarActivityPage implements OnInit {
  jar: Budget | null = null;
  transactions: Transaction[] = [];
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
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
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

  formatCurrency(value: string | number): string {
    const normalized = value.toString().replace(/[^0-9.-]+/g, '');
    const amount = Number.parseFloat(normalized);
    return new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);
  }

  goBack(): void {
    this.router.navigate(['/tabs/budgets', this.jarId]);
  }
}
