import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
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
  jarId: number | null = null;
  amount: number | null = null;
  category = '';
  note = '';
  spentAt = '';
  jars: Jar[] = [];

  constructor(private expenseService: ExpenseService, private jarService: JarService) {}

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
