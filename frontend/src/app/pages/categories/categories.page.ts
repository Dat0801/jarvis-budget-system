import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CategoryService, CategoryTreeNode, CategoryType } from '../../services/category.service';

type CategoryTab = 'expense' | 'income' | 'debtLoan';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
})
export class CategoriesPage {
  activeTab: CategoryTab = 'expense';
  categories: CategoryTreeNode[] = [];
  isLoading = false;
  loadError = '';
  private readonly expandedCategoryIds = new Set<number>();

  constructor(private categoryService: CategoryService) {
    this.fetchCategories();
  }

  selectTab(tab: CategoryTab): void {
    this.activeTab = tab;
    this.fetchCategories();
  }

  isExpanded(categoryId: number): boolean {
    return this.expandedCategoryIds.has(categoryId);
  }

  toggleCategory(categoryId: number): void {
    if (this.expandedCategoryIds.has(categoryId)) {
      this.expandedCategoryIds.delete(categoryId);
      return;
    }

    this.expandedCategoryIds.add(categoryId);
  }

  getCurrentTabLabel(): string {
    if (this.activeTab === 'income') {
      return 'Income';
    }

    if (this.activeTab === 'debtLoan') {
      return 'Debt/Loan';
    }

    return 'Expense';
  }

  getCategoryIcon(icon?: string | null): string {
    return icon || 'pricetag-outline';
  }

  private fetchCategories(): void {
    this.isLoading = true;
    this.loadError = '';

    this.categoryService.getTree(this.mapTabToType(this.activeTab)).subscribe({
      next: (response) => {
        this.categories = response.data;
        this.expandedCategoryIds.clear();
        this.categories.forEach((category) => {
          this.expandedCategoryIds.add(category.id);
        });
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.categories = [];
        this.loadError = 'Cannot load categories from server.';
      },
    });
  }

  private mapTabToType(tab: CategoryTab): CategoryType {
    if (tab === 'income') {
      return 'income';
    }

    if (tab === 'debtLoan') {
      return 'debt_loan';
    }

    return 'expense';
  }
}
