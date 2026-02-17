import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ExpenseService } from '../../services/expense.service';
import { Jar, JarService } from '../../services/jar.service';

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
  amount: number | null = null;
  category = '';
  note = '';
  spentAt = '';
  jars: Jar[] = [];

  constructor(
    private expenseService: ExpenseService,
    private jarService: JarService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadJars();
  }

  loadJars(): void {
    this.jarService.list().subscribe((jars) => {
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

  get selectedJar(): Jar | undefined {
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
    if (!this.amount || !this.jarBalance) {
      return false;
    }
    return this.amount > this.jarBalance;
  }

  get remainingBalanceText(): string {
    if (!this.jarBalance || !this.amount) {
      return '$0.00';
    }
    const remaining = Math.max(this.jarBalance - this.amount, 0);
    return `$${remaining.toFixed(2)}`;
  }

  submit(): void {
    if (!this.jarId || !this.amount) {
      return;
    }

    this.expenseService
      .create({
        jar_id: this.jarId,
        amount: this.amount,
        category: this.category || undefined,
        note: this.note || undefined,
        spent_at: this.spentAt || undefined,
      })
      .subscribe(() => {
        this.jarId = null;
        this.amount = null;
        this.category = '';
        this.note = '';
        this.spentAt = '';
      });
  }
}
