import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { finalize } from 'rxjs';
import { Wallet, WalletService } from '../../services/wallet.service';
import { FabService } from '../../services/fab.service';
import { formatVndAmountInput, parseVndAmount } from '../../utils/vnd-amount.util';
import { formatCurrencyAmount, normalizeCurrencyCode } from '../../utils/currency.util';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';

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
  isSaving = false;

  walletType: 'basic' = 'basic';
  walletName = '';
  currencyUnit = 'VND';
  initialBalance = '';
  notificationsEnabled = false;

  constructor(
    private walletService: WalletService,
    private toastController: ToastController,
    private fabService: FabService
  ) {}

  ngOnInit(): void {
    this.loadWallets();
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
    this.currencyUnit = 'VND';
    this.initialBalance = '';
    this.notificationsEnabled = false;
  }

  onInitialBalanceChange(value: string | number | null | undefined): void {
    this.initialBalance = String(value ?? '').replace(/\D+/g, '');
  }

  onInitialBalanceBlur(): void {
    this.initialBalance = formatVndAmountInput(this.initialBalance);
  }

  get canCreateWallet(): boolean {
    return this.walletName.trim().length > 0 && this.currencyUnit.trim().length > 0 && !this.isSaving;
  }

  submitCreateWallet(): void {
    if (!this.canCreateWallet) {
      return;
    }

    this.isSaving = true;
    this.walletService.create({
      wallet_type: this.walletType,
      name: this.walletName.trim(),
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
