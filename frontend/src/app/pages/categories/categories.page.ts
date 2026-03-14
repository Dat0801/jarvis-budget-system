import { CommonModule } from '@angular/common';
import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, PopoverController, ModalController } from '@ionic/angular';
import { CategoryService, CategoryTreeNode, CategoryType } from '../../services/category.service';
import { WalletService, Wallet } from '../../services/wallet.service';
import { BudgetService, Budget } from '../../services/budget.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { FabService } from '../../services/fab.service';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { searchOutline, pricetagOutline, chevronDownOutline, chevronForwardOutline, returnDownForwardOutline, swapVerticalOutline, walletOutline, addOutline } from 'ionicons/icons';
import { CategorySortPopoverComponent } from './components/category-sort-popover/category-sort-popover.component';
import { CategoryDetailPage } from './category-detail/category-detail.page';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

type CategoryTab = 'expense' | 'income' | 'debtLoan';
type SourcePage = 'transaction' | 'budget' | 'account';
type SortType = 'frequency' | 'name';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, IonicModule, PageHeaderComponent, FormsModule],
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
})
export class CategoriesPage implements OnInit {
  private readonly fabOwner = 'categories';
  @Input() isModal = false;
  @Input() initialTab: CategoryTab = 'expense';
  @Input() initialJarId: number | null = null;
  @Input() initialReturnUrl = '/expense';
  @Input() initialReturnMode = '';
  @Input() initialSelectMode = false;
  @Input() restrictTab: CategoryTab | null = null;
  @Input() restrictToParentOnly = false;
  @Input() filterByCategories: string[] = [];

  activeTab: CategoryTab = 'expense';
  categories: CategoryTreeNode[] = [];
  filteredCategories: CategoryTreeNode[] = [];
  wallets: Wallet[] = [];
  budgets: Budget[] = [];
  isLoading = false;
  loadError = '';
  isSelectMode = false;
  restrictToExpense = false;
  jarId: number | null = null;
  searchQuery = '';
  showSearchBar = false;
  sourcePage: SourcePage = 'account';
  sortType: SortType = 'name';
  private returnUrl = '/expense';
  private returnMode = '';

  constructor(
    private categoryService: CategoryService,
    private walletService: WalletService,
    private budgetService: BudgetService,
    private route: ActivatedRoute,
    private router: Router,
    private fabService: FabService,
    private popoverController: PopoverController,
    private modalController: ModalController
  ) {
    addIcons({ searchOutline, pricetagOutline, chevronDownOutline, chevronForwardOutline, returnDownForwardOutline, swapVerticalOutline, walletOutline, addOutline });
  }

  ngOnInit(): void {
    forkJoin({
      wallets: this.walletService.list().pipe(catchError(() => of([]))),
      budgets: this.budgetService.list().pipe(catchError(() => of([]))),
    }).subscribe(({ wallets, budgets }) => {
      this.wallets = wallets;
      this.budgets = budgets;
      this.initPage();
    });
  }

  private initPage(): void {
    if (this.isModal) {
      this.isSelectMode = this.initialSelectMode;
      this.jarId = this.initialJarId;
      this.activeTab = this.restrictTab || this.initialTab;
      this.returnUrl = this.initialReturnUrl;
      this.returnMode = this.initialReturnMode;
      this.updateSourcePage();
      this.fetchCategories();
    } else {
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
        
        this.updateSourcePage();
        this.fetchCategories();
      });
    }
  }

  private updateSourcePage(): void {
    if (!this.isSelectMode) {
      this.sourcePage = 'account';
    } else if (this.returnUrl.startsWith('/tabs/budgets')) {
      this.sourcePage = 'budget';
    } else {
      this.sourcePage = 'transaction';
    }

    if (this.sourcePage === 'budget' && this.activeTab === 'income') {
      this.activeTab = 'expense';
    }

    this.restrictToExpense = this.sourcePage === 'budget';
  }

  ionViewWillEnter(): void {
    if (this.sourcePage === 'account' || this.isSelectMode) {
      this.fabService.showFab(() => this.addCategory(), 'add', this.fabOwner);
    }
  }

  ionViewDidLeave(): void {
    this.fabService.hideFab(this.fabOwner);
  }

  selectTab(tab: CategoryTab): void {
    if (this.restrictToExpense && tab === 'income') {
      return;
    }

    this.activeTab = tab;
    this.fetchCategories();
  }

  get pageTitle(): string {
    if (this.sourcePage === 'transaction') {
      return 'Select category';
    }
    return 'Categories';
  }

  get backHref(): string {
    return this.isSelectMode ? this.returnUrl : '/tabs/settings';
  }

  onCategoryClick(categoryId: number): void {
    if (this.sourcePage === 'account') {
      this.router.navigate(['/tabs/categories', categoryId], {
        queryParams: { type: this.mapTabToType(this.activeTab) }
      });
      return;
    }

    const category = this.categories.find(c => c.id === categoryId);
    this.selectCategory(`category:${categoryId}`, category);
  }

  onSubCategoryClick(subCategoryId: number): void {
    if (this.sourcePage === 'account') {
      this.router.navigate(['/tabs/categories', subCategoryId], {
        queryParams: { type: this.mapTabToType(this.activeTab) }
      });
      return;
    }

    let subCategory: CategoryTreeNode | undefined;
    for (const cat of this.categories) {
      subCategory = cat.children?.find(c => c.id === subCategoryId);
      if (subCategory) break;
    }
    this.selectCategory(`sub:${subCategoryId}`, subCategory);
  }

  async addCategory() {
    if (this.isModal) {
      const modal = await this.modalController.create({
        component: CategoryDetailPage,
        componentProps: {
          isModal: true,
          initialType: this.mapTabToType(this.activeTab)
        }
      });
      await modal.present();
      const { data } = await modal.onDidDismiss();
      if (data) {
        this.fetchCategories();
      }
    } else {
      this.router.navigate(['/tabs/categories', 'new'], {
        queryParams: { type: this.mapTabToType(this.activeTab) }
      });
    }
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

  toggleSearchBar(): void {
    this.showSearchBar = !this.showSearchBar;
    if (!this.showSearchBar) {
      this.searchQuery = '';
      this.applySearchFilter();
    }
  }

  onSearch(event: any): void {
    this.searchQuery = event.detail.value || '';
    this.applySearchFilter();
  }

  onWalletChange(event: any): void {
    const value = event.detail.value;
    this.jarId = (value === -1 || value === undefined || value === null) ? null : Number(value);
    this.fetchCategories();
  }

  async openSortPopover(event: any) {
    const popover = await this.popoverController.create({
      component: CategorySortPopoverComponent,
      event: event,
      translucent: true,
      componentProps: {
        currentSort: this.sortType
      }
    });

    await popover.present();

    const { data } = await popover.onDidDismiss();
    if (data && data.sortType) {
      this.sortType = data.sortType;
      this.applySort();
    }
  }

  private fetchCategories(): void {
    this.isLoading = true;
    this.loadError = '';

    this.categoryService.getTree(this.mapTabToType(this.activeTab)).subscribe({
      next: (response) => {
        let data = response.data;
        
        // Filter by specific categories if provided (used in merge)
        if (this.filterByCategories.length > 0) {
          data = data.filter(category => this.filterByCategories.includes(category.name));
        }

        // Filter by jarId if provided
        if (this.jarId) {
          const isWallet = this.wallets.some(w => w.id === this.jarId);
          const budgetIds = this.budgets.map(b => b.id);

          data = data.filter(category => {
            const isGlobal = !category.jars || category.jars.length === 0;
            const matchesCurrentJar = category.jars?.some(j => j.id === this.jarId);
            const matchesAnyBudget = category.jars?.some(j => budgetIds.includes(j.id));

            let matches = isGlobal || matchesCurrentJar;
            
            // Special rule for transactions from a wallet:
            // Allow categories linked to any budget, because budget items can be paid from any wallet.
            if (this.sourcePage === 'transaction' && isWallet) {
              matches = matches || matchesAnyBudget;
            }

            if (matches) {
              // Also filter children
              if (category.children) {
                category.children = category.children.filter(child => {
                  const childIsGlobal = !child.jars || child.jars.length === 0;
                  const childMatchesCurrentJar = child.jars?.some(j => j.id === this.jarId);
                  const childMatchesAnyBudget = child.jars?.some(j => budgetIds.includes(j.id));
                  
                  let childMatches = childIsGlobal || childMatchesCurrentJar;
                  if (this.sourcePage === 'transaction' && isWallet) {
                    childMatches = childMatches || childMatchesAnyBudget;
                  }
                  return childMatches;
                });
              }
              return true;
            }
            return false;
          });
        }

        this.categories = data;
        this.applySearchFilter();
        this.applySort();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.categories = [];
        this.filteredCategories = [];
        this.loadError = 'Cannot load categories from server.';
      },
    });
  }

  private applySearchFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filteredCategories = [...this.categories];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredCategories = this.categories
        .map((cat) => {
          const matchedChildren = cat.children?.filter((child) =>
            child.name.toLowerCase().includes(query)
          );
          const isParentMatch = cat.name.toLowerCase().includes(query);

          if (isParentMatch || (matchedChildren && matchedChildren.length > 0)) {
            return {
              ...cat,
              children: matchedChildren,
            };
          }
          return null;
        })
        .filter((cat) => cat !== null) as CategoryTreeNode[];
    }
  }

  private applySort(): void {
    const sortFn = (a: CategoryTreeNode, b: CategoryTreeNode) => {
      if (this.sortType === 'name') {
        return a.name.localeCompare(b.name);
      } else {
        // frequency sort - assuming we have a frequency field or similar, otherwise fallback to name
        // For now, let's just sort by ID or something if frequency is not available
        return (b.id || 0) - (a.id || 0);
      }
    };

    this.filteredCategories.sort(sortFn);
    this.filteredCategories.forEach(cat => {
      if (cat.children) {
        cat.children.sort(sortFn);
      }
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

  closeModal(): void {
    if (this.isModal) {
      this.modalController.dismiss();
    }
  }

  private selectCategory(selectedCategory: string, categoryData?: CategoryTreeNode): void {
    if (this.isModal) {
      this.modalController.dismiss({
        selectedCategory,
        categoryData,
        tab: this.activeTab,
        returnMode: this.returnMode,
      });
      return;
    }

    const amount = this.route.snapshot.queryParamMap.get('amount');

    this.router.navigate([this.returnUrl], {
      queryParams: {
        selectedCategory,
        categoryIcon: categoryData?.icon || '',
        tab: this.activeTab,
        ...(amount ? { amount } : {}),
        ...(this.returnMode ? { returnMode: this.returnMode } : {}),
      },
    });
  }
}
