import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { JarService, Jar } from '../../services/jar.service';

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
  jars: Jar[] = [];
  totalBalance = 0;
  userName = 'Minh';
  timeOfDay = 'evening';
  incomeTotal = 4200;
  expenseTotal = 2850;
  recentTransactions: Transaction[] = [
    {
      title: 'Starbucks Coffee',
      time: 'Today, 08:30 AM',
      amount: -4.5,
      type: 'debit',
      icon: 'cafe',
    },
    {
      title: 'Salary Deposit',
      time: 'Yesterday',
      amount: 2400,
      type: 'credit',
      icon: 'cash',
    },
    {
      title: 'Online Grocery',
      time: 'Yesterday',
      amount: -54.2,
      type: 'debit',
      icon: 'cart',
    },
  ];

  constructor(private jarService: JarService) {}

  ngOnInit(): void {
    this.updateTimeOfDay();
    this.loadSummary();
  }

  loadSummary(): void {
    this.jarService.list().subscribe((jars) => {
      this.jars = jars;
      this.totalBalance = jars.reduce((sum, jar) => sum + Number(jar.balance), 0);
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

  getJarProgress(jar: Jar): number {
    const balance = Number(jar.balance);
    if (!this.totalBalance || Number.isNaN(balance)) {
      return 0;
    }
    return Math.min(100, Math.max(0, (balance / this.totalBalance) * 100));
  }
}
