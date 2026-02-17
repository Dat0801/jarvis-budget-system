import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Jar, JarService } from '../../../services/jar.service';

export interface Transaction {
  id: number;
  jar_id: number;
  amount: string;
  type: 'income' | 'expense';
  category?: string;
  source?: string;
  note?: string;
  created_at: string;
  spent_at?: string;
  received_at?: string;
}

export interface JarDetail extends Jar {
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
    private jarService: JarService,
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
    this.jarService.detail(this.jarId).subscribe((jar: JarDetail) => {
      this.jar = jar;
      this.editName = jar.name;
      this.editDescription = jar.description || '';
      this.loadTransactions();
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
    const amount = parseFloat(this.addAmount);
    if (amount > 0) {
      this.jarService.addMoney(this.jarId, amount).subscribe(() => {
        this.closeAddMoney();
        this.loadJarDetail();
      });
    }
  }

  openEditJar(): void {
    this.isEditJarOpen = true;
  }

  closeEditJar(): void {
    this.isEditJarOpen = false;
  }

  submitEditJar(): void {
    if (!this.jarId || !this.editName) return;
    this.jarService.update(this.jarId, {
      name: this.editName,
      description: this.editDescription || null,
    }).subscribe(() => {
      this.closeEditJar();
      this.loadJarDetail();
    });
  }

  goBack(): void {
    this.router.navigate(['/tabs/jars']);
  }

  seeAllTransactions(): void {
    this.router.navigate(['/tabs/jars', this.jarId, 'activity']);
  }
}
