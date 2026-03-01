import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { finalize } from 'rxjs';
import { Wallet, WalletService } from '../../services/wallet.service';
import { FabService } from '../../services/fab.service';
import { formatVndAmountInput, parseVndAmount } from '../../utils/vnd-amount.util';
import { formatCurrencyAmount, normalizeCurrencyCode } from '../../utils/currency.util';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { CategoryService, CategoryTreeNode } from '../../services/category.service';
import { addIcons } from 'ionicons';
import { arrowBackOutline, closeOutline, walletOutline, pencil, notificationsOutline, alertCircleOutline, searchOutline, chevronForwardOutline, chevronBackOutline, trashOutline } from 'ionicons/icons';

@Component({
  selector: 'app-wallets',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, PageHeaderComponent],
  templateUrl: './wallets.page.html',
  styleUrls: ['./wallets.page.scss'],
})
export class WalletsPage implements OnInit {
  private readonly fabOwner = 'wallets';
  wallets: Wallet[] = [];
  isLoading = false;
  isCreateOpen = false;
  isEditOpen = false;
  isSaving = false;
  isIconModalOpen = false;
  isCategoryModalOpen = false;

  // Create fields
  walletType: 'basic' = 'basic';
  walletName = '';
  walletIcon = 'wallet-outline';
  currencyUnit = 'VND';
  initialBalance = '';
  notificationsEnabled = false;

  // Edit fields
  editWalletId: number | null = null;
  editWalletName = '';
  editIcon = 'wallet-outline';
  editCurrencyUnit = 'VND';
  editBalance = '';
  editNotificationsEnabled = false;
  editCategoriesCount = 0;

  // Category management
  categories: CategoryTreeNode[] = [];
  isLoadingCategories = false;
  isAddCategoryOpen = false;
  newCategoryName = '';

  allIcons = [
    'wallet-outline', 'card-outline', 'cash-outline', 'briefcase-outline',
    'business-outline', 'home-outline', 'car-outline', 'airplane-outline',
    'gift-outline', 'heart-outline', 'star-outline', 'flask-outline',
    'construct-outline', 'build-outline', 'hammer-outline', 'settings-outline'
  ];

  constructor(
    private walletService: WalletService,
    private categoryService: CategoryService,
    private toastController: ToastController,
    private alertController: AlertController,
    private fabService: FabService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    addIcons({
      arrowBackOutline,
      closeOutline,
      walletOutline,
      pencil,
      notificationsOutline,
      alertCircleOutline,
      searchOutline,
      chevronForwardOutline,
      chevronBackOutline,
      trashOutline
    });
  }

  ngOnInit(): void {
    this.loadWallets();

    this.route.queryParams.subscribe(params => {
      const editId = params['editId'];
      if (editId) {
        this.waitForWalletsAndOpenEdit(Number(editId));
      }
    });
  }

  private waitForWalletsAndOpenEdit(id: number): void {
    if (this.isLoading) {
      setTimeout(() => this.waitForWalletsAndOpenEdit(id), 100);
      return;
    }
    const wallet = this.wallets.find(w => w.id === id);
    if (wallet) {
      this.openEditWallet(wallet);
      // Clear query params
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { editId: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  ionViewWillEnter(): void {
    this.fabService.showFab(() => this.openCreateWallet(), 'add', this.fabOwner);
  }

  ionViewDidLeave(): void {
    this.fabService.hideFab(this.fabOwner);
  }

  loadWallets(): void {
    this.isLoading = true;
    this.walletService.list().pipe(finalize(() => {
      this.isLoading = false;
    })).subscribe({
      next: (wallets) => {
        this.wallets = wallets;
      },
      error: () => {
        this.wallets = [];
      },
    });
  }

  openCreateWallet(): void {
    this.isCreateOpen = true;
  }

  closeCreateWallet(): void {
    this.isCreateOpen = false;
    this.walletType = 'basic';
    this.walletName = '';
    this.walletIcon = 'wallet-outline';
    this.currencyUnit = 'VND';
    this.initialBalance = '';
    this.notificationsEnabled = false;
  }

  openEditWallet(wallet: Wallet): void {
    this.editWalletId = wallet.id;
    this.editWalletName = wallet.name;
    this.editIcon = wallet.icon || 'wallet-outline';
    this.editCurrencyUnit = wallet.currency_unit;
    this.editBalance = formatVndAmountInput(wallet.balance.toString().split('.')[0]);
    this.editNotificationsEnabled = wallet.notifications_enabled;
    this.editCategoriesCount = wallet.categories_count || 0;
    this.isEditOpen = true;
  }

  closeEditWallet(): void {
    this.isEditOpen = false;
    this.editWalletId = null;
  }

  async onBalanceInput(event: any, isEdit = false): Promise<void> {
    const ionInput = event.target as HTMLIonInputElement;
    const input = await ionInput.getInputElement();
    const originalValue = input.value || '';
    const digits = originalValue.replace(/\D/g, '');
    const formatted = formatVndAmountInput(digits);
    
    if (isEdit) {
      if (this.editBalance !== formatted) {
        const cursor = input.selectionStart || 0;
        const digitsBeforeCursor = originalValue.substring(0, cursor).replace(/\D/g, '').length;
        this.editBalance = formatted;
        input.value = formatted;
        let newCursor = 0;
        let digitsFound = 0;
        for (let i = 0; i < formatted.length && digitsFound < digitsBeforeCursor; i++) {
          if (/\d/.test(formatted[i])) digitsFound++;
          newCursor = i + 1;
        }
        input.setSelectionRange(newCursor, newCursor);
      }
    } else {
      if (this.initialBalance !== formatted) {
        const cursor = input.selectionStart || 0;
        const digitsBeforeCursor = originalValue.substring(0, cursor).replace(/\D/g, '').length;
        this.initialBalance = formatted;
        input.value = formatted;
        let newCursor = 0;
        let digitsFound = 0;
        for (let i = 0; i < formatted.length && digitsFound < digitsBeforeCursor; i++) {
          if (/\d/.test(formatted[i])) digitsFound++;
          newCursor = i + 1;
        }
        input.setSelectionRange(newCursor, newCursor);
      }
    }
  }

  get canCreateWallet(): boolean {
    return this.walletName.trim().length > 0 && this.currencyUnit.trim().length > 0 && !this.isSaving;
  }

  get canUpdateWallet(): boolean {
    return this.editWalletName.trim().length > 0 && this.editCurrencyUnit.trim().length > 0 && !this.isSaving;
  }

  submitCreateWallet(): void {
    if (!this.canCreateWallet) {
      return;
    }

    this.isSaving = true;
    this.walletService.create({
      wallet_type: this.walletType,
      name: this.walletName.trim(),
      icon: this.walletIcon,
      currency_unit: this.currencyUnit.trim().toUpperCase(),
      initial_balance: parseVndAmount(this.initialBalance) || 0,
      notifications_enabled: this.notificationsEnabled,
    }).pipe(finalize(() => {
      this.isSaving = false;
    })).subscribe({
      next: async () => {
        this.closeCreateWallet();
        this.loadWallets();
        await this.showToast('Wallet created');
      },
      error: async () => {
        await this.showToast('Cannot create wallet');
      },
    });
  }

  submitUpdateWallet(): void {
    if (!this.canUpdateWallet || !this.editWalletId) {
      return;
    }

    this.isSaving = true;
    this.walletService.update(this.editWalletId, {
      name: this.editWalletName.trim(),
      icon: this.editIcon,
      currency_unit: this.editCurrencyUnit.trim().toUpperCase(),
      balance: parseVndAmount(this.editBalance) || 0,
      notifications_enabled: this.editNotificationsEnabled,
    }).pipe(finalize(() => {
      this.isSaving = false;
    })).subscribe({
      next: async () => {
        this.closeEditWallet();
        this.loadWallets();
        await this.showToast('Wallet updated');
      },
      error: async () => {
        await this.showToast('Cannot update wallet');
      },
    });
  }

  async deleteWallet(): Promise<void> {
    if (!this.editWalletId) return;

    const alert = await this.alertController.create({
      header: 'Delete Wallet',
      message: 'Are you sure you want to delete this wallet? All transactions and data related to this wallet will be permanently removed.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.isSaving = true;
            this.walletService.delete(this.editWalletId!).pipe(finalize(() => {
              this.isSaving = false;
            })).subscribe({
              next: async () => {
                this.closeEditWallet();
                this.loadWallets();
                await this.showToast('Wallet deleted');
              },
              error: async () => {
                await this.showToast('Cannot delete wallet');
              },
            });
          }
        }
      ]
    });

    await alert.present();
  }

  selectIcon(icon: string, isEdit = false): void {
    if (isEdit) {
      this.editIcon = icon;
    } else {
      this.walletIcon = icon;
    }
    this.isIconModalOpen = false;
  }

  openCategoryManagement(): void {
    if (!this.editWalletId) return;
    this.isCategoryModalOpen = true;
    this.loadCategories();
  }

  loadCategories(): void {
    if (!this.editWalletId) return;
    this.isLoadingCategories = true;
    this.walletService.getCategories(this.editWalletId).pipe(finalize(() => {
      this.isLoadingCategories = false;
    })).subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: () => {
        this.categories = [];
      },
    });
  }

  toggleCategoryStatus(category: CategoryTreeNode): void {
    const newStatus = !category.is_active;
    this.categoryService.update(category.id, { is_active: newStatus }).subscribe({
      next: () => {
        category.is_active = newStatus;
      },
      error: async () => {
        await this.showToast('Cannot update category');
      }
    });
  }

  addCategory(): void {
    if (!this.newCategoryName.trim() || !this.editWalletId) return;

    this.categoryService.create({
      type: 'expense', // Default to expense
      name: this.newCategoryName.trim(),
      jar_ids: [this.editWalletId]
    }).subscribe({
      next: () => {
        this.newCategoryName = '';
        this.isAddCategoryOpen = false;
        this.loadCategories();
        this.editCategoriesCount++;
      },
      error: async () => {
        await this.showToast('Cannot add category');
      }
    });
  }

  formatBalance(wallet: Wallet): string {
    const amount = Number(wallet.balance || 0);
    return formatCurrencyAmount(amount, normalizeCurrencyCode(wallet.currency_unit));
  }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 1800,
      position: 'bottom',
    });

    await toast.present();
  }
}
