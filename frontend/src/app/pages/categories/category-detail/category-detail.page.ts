import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { CategoryService, CategoryTreeNode, CategoryType } from '../../../services/category.service';
import { WalletService, Wallet } from '../../../services/wallet.service';
import { PageHeaderComponent } from '../../../shared/page-header/page-header.component';
import { addIcons } from 'ionicons';
import { closeOutline, trashOutline, walletOutline, searchOutline } from 'ionicons/icons';

@Component({
  selector: 'app-category-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, PageHeaderComponent],
  templateUrl: './category-detail.page.html',
  styleUrls: ['./category-detail.page.scss'],
})
export class CategoryDetailPage implements OnInit {
  categoryId: number | null = null;
  type: CategoryType = 'expense';
  name = '';
  icon = 'pricetag-outline';
  parentId: number | null = null;
  selectedWalletIds: number[] = [];
  
  parentCategories: CategoryTreeNode[] = [];
  wallets: Wallet[] = [];
  isLoading = false;
  isSaving = false;
  isIconModalOpen = false;
  isWalletModalOpen = false;
  iconSearchTerm = '';
  filteredIcons: string[] = [];

  readonly icons = [
    'pricetag-outline', 'cart-outline', 'restaurant-outline', 'bus-outline', 
    'home-outline', 'flash-outline', 'water-outline', 'phone-portrait-outline',
    'medical-outline', 'fitness-outline', 'shirt-outline', 'gift-outline',
    'school-outline', 'game-controller-outline', 'airplane-outline', 'car-outline',
    'briefcase-outline', 'cash-outline', 'wallet-outline', 'card-outline',
    'trending-up-outline', 'trending-down-outline', 'star-outline', 'heart-outline'
  ];

  readonly allIcons = [
    // Finance & Shopping
    'cash-outline', 'card-outline', 'wallet-outline', 'cart-outline', 'pricetag-outline', 'bag-outline', 'gift-outline', 'calculator-outline', 'diamond-outline', 'analytics-outline',
    // Food & Drink
    'restaurant-outline', 'cafe-outline', 'beer-outline', 'pizza-outline', 'fast-food-outline', 'wine-outline', 'ice-cream-outline',
    // Transport & Travel
    'bus-outline', 'car-outline', 'airplane-outline', 'train-outline', 'bicycle-outline', 'boat-outline', 'rocket-outline', 'map-outline', 'earth-outline',
    // Home & Utilities
    'home-outline', 'flash-outline', 'water-outline', 'phone-portrait-outline', 'tv-outline', 'bulb-outline', 'wifi-outline', 'trash-outline', 'key-outline',
    // Health & Fitness
    'medical-outline', 'fitness-outline', 'bandage-outline', 'heart-outline', 'pulse-outline', 'medkit-outline', 'thermometer-outline',
    // Education & Work
    'school-outline', 'briefcase-outline', 'book-outline', 'library-outline', 'pencil-outline', 'laptop-outline', 'print-outline', 'copy-outline',
    // Entertainment & Leisure
    'game-controller-outline', 'musical-notes-outline', 'camera-outline', 'film-outline', 'ticket-outline', 'trophy-outline', 'football-outline', 'basketball-outline',
    // Nature & Others
    'sunny-outline', 'cloud-outline', 'leaf-outline', 'paw-outline', 'umbrella-outline', 'brush-outline', 'construct-outline', 'star-outline'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private categoryService: CategoryService,
    private walletService: WalletService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    addIcons({ closeOutline, trashOutline, walletOutline, searchOutline });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id && id !== 'new') {
        this.categoryId = Number(id);
      }
    });

    this.route.queryParamMap.subscribe(params => {
      const typeParam = params.get('type') as CategoryType;
      if (typeParam) {
        this.type = typeParam;
      }
      this.fetchInitialData();
    });
  }

  async fetchInitialData() {
    this.isLoading = true;
    try {
      // Fetch wallets
      this.walletService.list().subscribe(res => {
        this.wallets = res;
        // If creating new category, default to all wallets selected
        if (!this.categoryId) {
          this.selectedWalletIds = this.wallets.map(w => w.id);
        }
      });

      // Fetch parent categories (only top-level categories of the same type)
      this.fetchParentCategories();

      this.filteredIcons = [...this.allIcons];

      // Fetch category detail if editing
      if (this.categoryId) {
        // We fetch the tree without type restriction to find the category
        this.categoryService.getTree().subscribe(res => {
          const findCategory = (nodes: CategoryTreeNode[]): CategoryTreeNode | null => {
            for (const node of nodes) {
              if (node.id === this.categoryId) return node;
              if (node.children) {
                const found = findCategory(node.children);
                if (found) return found;
              }
            }
            return null;
          };

          const category = findCategory(res.data);
          if (category) {
            this.name = category.name;
            this.type = category.type;
            this.icon = category.icon || 'pricetag-outline';
            this.parentId = category.parent_id;
            
            // Re-fetch parents for the correct type if it's different from initial
            this.fetchParentCategories();

            // If category has jars defined, use them. Otherwise default to all wallets.
            if (category.jars && category.jars.length > 0) {
              this.selectedWalletIds = category.jars.map(j => j.id);
            } else {
              // Note: If the backend returns empty jars, it might mean it's available in all wallets
              // or just hasn't been configured. To match "default show in all", we set all if empty.
              this.selectedWalletIds = this.wallets.map(w => w.id);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error fetching data', error);
    } finally {
      this.isLoading = false;
    }
  }

  getSelectedWallets(): Wallet[] {
    return this.wallets.filter(w => this.isWalletSelected(w.id));
  }

  openWalletModal() {
    this.isWalletModalOpen = true;
  }

  selectIcon(icon: string) {
    this.icon = icon;
    this.isIconModalOpen = false;
  }

  openIconModal() {
    this.iconSearchTerm = '';
    this.filteredIcons = [...this.allIcons];
    this.isIconModalOpen = true;
  }

  onIconSearch(event: any) {
    const query = event.target.value.toLowerCase();
    if (!query) {
      this.filteredIcons = [...this.allIcons];
    } else {
      this.filteredIcons = this.allIcons.filter(icon => 
        icon.toLowerCase().includes(query)
      );
    }
  }

  isWalletSelected(walletId: number): boolean {
    return this.selectedWalletIds.includes(walletId);
  }

  onTypeChange() {
    this.parentId = null; // Reset parent when type changes
    this.fetchParentCategories();
  }

  private fetchParentCategories() {
    this.categoryService.getTree(this.type).subscribe(res => {
      this.parentCategories = res.data.filter(c => c.id !== this.categoryId);
    });
  }

  toggleWallet(walletId: number) {
    if (this.isWalletSelected(walletId)) {
      this.selectedWalletIds = this.selectedWalletIds.filter(id => id !== walletId);
    } else {
      this.selectedWalletIds.push(walletId);
    }
  }

  async save() {
    if (!this.name.trim()) {
      const toast = await this.toastCtrl.create({
        message: 'Please enter category name',
        duration: 2000,
        color: 'danger'
      });
      toast.present();
      return;
    }

    this.isSaving = true;
    const payload = {
      type: this.type,
      name: this.name,
      icon: this.icon,
      parent_id: this.parentId || undefined,
      jar_ids: this.selectedWalletIds
    };

    const request = this.categoryId 
      ? this.categoryService.update(this.categoryId, payload)
      : this.categoryService.create(payload);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.router.navigate(['/tabs/categories'], { queryParams: { type: this.type } });
      },
      error: (err) => {
        this.isSaving = false;
        console.error('Error saving category', err);
      }
    });
  }

  async deleteCategory() {
    if (!this.categoryId) return;

    const alert = await this.alertCtrl.create({
      header: 'Confirm Delete',
      message: 'Are you sure you want to delete this category?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { 
          text: 'Delete', 
          role: 'destructive',
          handler: () => {
            this.categoryService.delete(this.categoryId!).subscribe(() => {
              this.router.navigate(['/tabs/categories'], { queryParams: { type: this.type } });
            });
          }
        }
      ]
    });
    await alert.present();
  }
}
