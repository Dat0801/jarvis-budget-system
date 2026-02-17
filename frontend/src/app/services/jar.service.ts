import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface Jar {
  id: number;
  name: string;
  balance: string;
  description?: string | null;
  target?: number;
}

export interface Transaction {
  id: number;
  jar_id: number;
  amount: string;
  type: 'income' | 'expense';
  category?: string;
  source?: string;
  note?: string;
  created_at: string;
  spent_at?: string;
  received_at?: string;
}

@Injectable({ providedIn: 'root' })
export class JarService {
  constructor(private api: ApiService) {}

  list() {
    return this.api.get<Jar[]>('jars');
  }

  detail(id: number) {
    return this.api.get<Jar>(`jars/${id}`);
  }

  create(payload: { name: string; description?: string | null; balance?: number }) {
    return this.api.post<Jar>('jars', payload);
  }

  update(id: number, payload: { name?: string; description?: string | null }) {
    return this.api.patch<Jar>(`jars/${id}`, payload);
  }

  remove(id: number) {
    return this.api.delete<{ message: string }>(`jars/${id}`);
  }

  getTransactions(jarId: number) {
    return this.api.get<Transaction[]>(`jars/${jarId}/transactions`);
  }

  addMoney(jarId: number, amount: number) {
    return this.api.post<Jar>(`jars/${jarId}/add-money`, { amount });
  }
}
