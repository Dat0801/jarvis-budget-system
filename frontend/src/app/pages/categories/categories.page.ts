import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { CategoryService, CategoryTreeNode, CategoryType } from '../../services/category.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { FabService } from '../../services/fab.service';

type CategoryTab = 'expense' | 'income' | 'debtLoan';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, IonicModule, PageHeaderComponent],
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
})
export class CategoriesPage implements OnInit {
  private readonly fabOwner = 'categories';
  activeTab: CategoryTab = 'expense';
  categories: CategoryTreeNode[] = [];
  isLoading = false;
  loadError = '';
  isSelectMode = false;
  restrictToExpense = false;
  jarId: number | null = null;
  private returnUrl = '/expense';
  private returnMode = '';
  private readonly expandedCategoryIds = new Set<number>();

  constructor(
    private categoryService: CategoryService,
    private route: ActivatedRoute,
    private router: Router,
    private fabService: FabService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.isSelectMode = params.get('selectMode') === '1';
      const jarIdParam = params.get('jarId');
      this.jarId = jarIdParam ? Number(jarIdParam) : null;

      const typeParam = params.get('type');
      if (typeParam === 'income') {
        this.activeTab = 'income';
      } else if (typeParam === 'debtLoan') {
        this.activeTab = 'debtLoan';
      } else {
        this.activeTab = 'expense';
      }

      this.returnUrl = params.get('returnUrl') || '/expense';
      this.returnMode = params.get('returnMode') || '';
      this.restrictToExpense =
        this.isSelectMode && this.returnUrl.startsWith('/tabs/budgets');
      this.fetchCategories();
    });
  }

  ionViewWillEnter(): void {
    if (!this.isSelectMode) {
      this.fabService.showFab(() => this.addCategory(), 'add', this.fabOwner);
    }
  }

  ionViewDidLeave(): void {
    this.fabService.hideFab(this.fabOwner);
  }

  selectTab(tab: CategoryTab): void {
    if (this.restrictToExpense && tab !== 'expense') {
      return;
    }

    this.activeTab = tab;
    this.fetchCategories();
  }

  get backHref(): string {
    return this.isSelectMode ? this.returnUrl : '/tabs/settings';
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

  onCategoryClick(categoryId: number): void {
    if (!this.isSelectMode) {
      this.router.navigate(['/tabs/categories', categoryId], {
        queryParams: { type: this.mapTabToType(this.activeTab) }
      });
      return;
    }

    this.selectCategory(`category:${categoryId}`);
  }

  onSubCategoryClick(subCategoryId: number): void {
    if (!this.isSelectMode) {
      this.router.navigate(['/tabs/categories', subCategoryId], {
        queryParams: { type: this.mapTabToType(this.activeTab) }
      });
      return;
    }

    this.selectCategory(`sub:${subCategoryId}`);
  }

  addCategory(): void {
    this.router.navigate(['/tabs/categories', 'new'], {
      queryParams: { type: this.mapTabToType(this.activeTab) }
    });
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
        let data = response.data;
        
        // Filter by jarId if provided
        if (this.jarId) {
          data = data.filter(category => {
            const matchesJar = !category.jars || category.jars.length === 0 || category.jars.some(j => j.id === this.jarId);
            if (matchesJar) {
              // Also filter children
              if (category.children) {
                category.children = category.children.filter(child => 
                  !child.jars || child.jars.length === 0 || child.jars.some(j => j.id === this.jarId)
                );
              }
              return true;
            }
            return false;
          });
        }

        this.categories = data;
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

  private selectCategory(selectedCategory: string): void {
    const amount = this.route.snapshot.queryParamMap.get('amount');

    const urlTree = this.router.createUrlTree([this.returnUrl], {
      queryParams: {
        selectedCategory,
        tab: this.activeTab,
        ...(amount ? { amount } : {}),
        ...(this.returnMode ? { returnMode: this.returnMode } : {}),
      },
    });

    const url = this.router.serializeUrl(urlTree);
    window.location.href = url;
  }
}
