import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface Wallet {
  id: number;
  name: string;
  balance: string;
  wallet_type: string;
  currency_unit: string;
  notifications_enabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class WalletService {
  constructor(private api: ApiService) {}

  list() {
    return this.api.get<Wallet[]>('wallets');
  }

  create(payload: {
    wallet_type: 'basic';
    name: string;
    currency_unit: string;
    initial_balance?: number;
    notifications_enabled?: boolean;
  }) {
    return this.api.post<Wallet>('wallets', payload);
  }
}
