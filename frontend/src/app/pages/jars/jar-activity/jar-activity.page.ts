import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Jar, JarService, Transaction } from '../../../services/jar.service';

@Component({
  selector: 'app-jar-activity',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './jar-activity.page.html',
  styleUrls: ['./jar-activity.page.scss'],
})
export class JarActivityPage implements OnInit {
  jar: Jar | null = null;
  transactions: Transaction[] = [];
  jarId: number | null = null;

  constructor(
    private jarService: JarService,
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
    this.jarService.detail(this.jarId).subscribe((jar: Jar) => {
      this.jar = jar;
    });
  }

  loadTransactions(): void {
    if (!this.jarId) return;
    this.jarService.getTransactions(this.jarId).subscribe((transactions: Transaction[]) => {
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
    return parseFloat(value.toString()).toFixed(2);
  }

  goBack(): void {
    this.router.navigate(['/tabs/jars', this.jarId]);
  }
}
