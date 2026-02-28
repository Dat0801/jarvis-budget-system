import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface Wallet {
  id: number;
  name: string;
  icon?: string;
  balance: string;
  wallet_type: string;
  currency_unit: string;
  notifications_enabled: boolean;
  categories_count?: number;
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
    icon?: string;
    currency_unit: string;
    initial_balance?: number;
    notifications_enabled?: boolean;
  }) {
    return this.api.post<Wallet>('wallets', payload);
  }

  update(id: number, payload: {
    name?: string;
    icon?: string;
    currency_unit?: string;
    balance?: number;
    notifications_enabled?: boolean;
  }) {
    return this.api.patch<Wallet>(`wallets/${id}`, payload);
  }

  delete(id: number) {
    return this.api.delete<{ message: string }>(`wallets/${id}`);
  }

  getCategories(id: number) {
    return this.api.get<any[]>(`wallets/${id}/categories`);
  }
}
