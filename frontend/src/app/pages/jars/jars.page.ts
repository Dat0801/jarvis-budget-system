import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Budget, BudgetService } from '../../services/budget.service';
import { FabService } from '../../services/fab.service';
import { formatVndAmountInput, parseVndAmount } from '../../utils/vnd-amount.util';

@Component({
  selector: 'app-jars',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './jars.page.html',
  styleUrls: ['./jars.page.scss'],
})
export class JarsPage implements OnInit {
  jars: Budget[] = [];
  totalSaved = 0;
  totalSavedMain = '0';
  totalSavedCents = '00';
  isCreateJarOpen = false;
  jarName = '';
  jarTarget = '';
  jarDescription = '';
  private readonly targetOverrides = [
    { match: 'emergency', target: 10000 },
    { match: 'car', target: 45000 },
    { match: 'trip', target: 5000 },
  ];
  private readonly targetPattern = /\[target=(\d+(?:\.\d+)?)\]/;

  constructor(private budgetService: BudgetService, private fabService: FabService, private router: Router) {}

  ngOnInit(): void {
    this.loadJars();
  }

  ionViewWillEnter(): void {
    // Show the global FAB with the openCreateJar action
    this.fabService.showFab(() => this.openCreateJar(), 'add');
  }

  ionViewDidLeave(): void {
    // Hide the global FAB when leaving this page
    this.fabService.hideFab();
  }

  loadJars(): void {
    this.budgetService.list().subscribe((jars) => {
      this.jars = jars;
      this.updateTotals();
    });
  }

  openCreateJar(): void {
    this.isCreateJarOpen = true;
  }

  closeCreateJar(): void {
    this.isCreateJarOpen = false;
    this.resetCreateForm();
  }

  submitCreateJar(): void {
    const name = this.jarName.trim();
    if (!name) {
      return;
    }
    const description = this.buildDescriptionWithTarget(
      this.jarDescription,
      this.jarTarget
    );
    this.createJar(name, description || undefined);
    this.closeCreateJar();
  }

  onJarTargetInput(event: CustomEvent): void {
    this.jarTarget = formatVndAmountInput(event.detail?.value);
  }

  get canSaveJar(): boolean {
    return this.jarName.trim().length > 0;
  }

  getJarTarget(jar: Budget): number {
    const name = jar.name.toLowerCase();
    const embeddedTarget = this.parseTargetFromDescription(jar.description);
    if (embeddedTarget) {
      return embeddedTarget;
    }
    const override = this.targetOverrides.find((item) => name.includes(item.match));
    return override?.target ?? 10000;
  }

  getJarDescription(jar: Budget): string {
    return this.stripTargetTag(jar.description) || 'No description yet';
  }

  getJarProgress(jar: Budget): number {
    const balance = this.parseBalance(jar.balance);
    const target = this.getJarTarget(jar);
    if (!target) {
      return 0;
    }
    return Math.min(100, Math.round((balance / target) * 100));
  }

  getJarIcon(jar: Budget): string {
    const name = jar.name.toLowerCase();
    if (name.includes('emergency')) {
      return 'shield-checkmark';
    }
    if (name.includes('car')) {
      return 'car';
    }
    if (name.includes('trip')) {
      return 'airplane';
    }
    return 'wallet';
  }

  getJarIconClass(jar: Budget): string {
    const name = jar.name.toLowerCase();
    if (name.includes('emergency')) {
      return 'jar-icon--orange';
    }
    if (name.includes('car')) {
      return 'jar-icon--blue';
    }
    if (name.includes('trip')) {
      return 'jar-icon--pink';
    }
    return 'jar-icon--gray';
  }

  formatCurrency(value: number | string, withCents = false): string {
    const amount = typeof value === 'string' ? this.parseBalance(value) : value;
    const formatter = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return formatter.format(amount);
  }

  navigateToJar(jarId: number): void {
    this.router.navigate(['/tabs/budgets', jarId]);
  }

  private createJar(name: string, description?: string): void {
    this.budgetService.create({ name, description }).subscribe(() => this.loadJars());
  }

  private resetCreateForm(): void {
    this.jarName = '';
    this.jarTarget = '';
    this.jarDescription = '';
  }

  private buildDescriptionWithTarget(description: string, target: string): string {
    const cleanDescription = description.trim();
    const normalizedTarget = parseVndAmount(target);
    const parts = [] as string[];
    if (normalizedTarget !== null) {
      parts.push(`[target=${normalizedTarget}]`);
    }
    if (cleanDescription) {
      parts.push(cleanDescription);
    }
    return parts.join(' ');
  }

  private parseTargetFromDescription(description?: string | null): number | null {
    if (!description) {
      return null;
    }
    const match = description.match(this.targetPattern);
    if (!match) {
      return null;
    }
    const parsed = Number.parseFloat(match[1]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private stripTargetTag(description?: string | null): string {
    if (!description) {
      return '';
    }
    return description.replace(this.targetPattern, '').trim();
  }

  private parseBalance(balance: string): number {
    const normalized = balance.replace(/[^0-9.-]+/g, '');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private updateTotals(): void {
    this.totalSaved = this.jars.reduce(
      (sum, jar) => sum + this.parseBalance(jar.balance),
      0
    );
    const formatted = this.formatCurrency(this.totalSaved, true);
    const [main, cents] = formatted.split('.');
    this.totalSavedMain = main || '0';
    this.totalSavedCents = cents || '00';
  }
}
