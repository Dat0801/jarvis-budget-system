import { Component, OnInit } from '@angular/core';
import { StatsService, SpendingAnalytics, IncomeVsExpenses, Summary } from '../services/stats.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  standalone: false,
})
export class Tab2Page implements OnInit {
  spendingData: SpendingAnalytics | null = null;
  incomeVsExpensesData: IncomeVsExpenses | null = null;
  summary: Summary | null = null;
  
  selectedMonth: string = '';
  isLoading = true;
  error: string | null = null;

  // Chart data
  chartLabels: string[] = [];
  incomeData: number[] = [];
  expenseData: number[] = [];

  constructor(private statsService: StatsService) {
    const now = new Date();
    this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.isLoading = true;
    this.error = null;

    this.statsService.getSpendingAnalytics(this.selectedMonth).subscribe({
      next: (data) => {
        this.spendingData = data;
      },
      error: (err) => {
        console.error('Error loading spending analytics:', err);
        this.error = 'Failed to load spending analytics';
      }
    });

    this.statsService.getIncomeVsExpenses().subscribe({
      next: (data) => {
        this.incomeVsExpensesData = data;
        this.chartLabels = data.months;
        this.incomeData = data.income;
        this.expenseData = data.expenses;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading income vs expenses:', err);
        this.error = 'Failed to load income vs expenses';
        this.isLoading = false;
      }
    });

    this.statsService.getSummary().subscribe({
      next: (data) => {
        this.summary = data;
      },
      error: (err) => {
        console.error('Error loading summary:', err);
      }
    });
  }

  onMonthChange(event: any) {
    this.selectedMonth = event.detail.value;
    this.loadStats();
  }

  getJarChartData() {
    if (!this.spendingData) return [];
    return this.spendingData.expenses_by_jar.map(jar => ({
      name: jar.jar_name,
      value: jar.amount,
      percentage: jar.percentage,
      color: jar.jar_color
    }));
  }

  getDonutSegmentOffset(index: number): number {
    if (!this.spendingData) return 0;
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += (this.spendingData.expenses_by_jar[i].percentage * 2.51);
    }
    return -offset;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }
}
