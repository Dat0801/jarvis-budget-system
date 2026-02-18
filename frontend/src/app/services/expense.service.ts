import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  constructor(private api: ApiService) {}

  list() {
    return this.api.get('expenses');
  }

  detail(id: number) {
    return this.api.get(`expenses/${id}`);
  }

  create(payload: { jar_id: number; amount: number; category?: string; note?: string; spent_at?: string }) {
    return this.api.post('expenses', payload);
  }

  update(id: number, payload: { jar_id?: number; amount?: number; category?: string; note?: string; spent_at?: string }) {
    return this.api.patch(`expenses/${id}`, payload);
  }

  remove(id: number) {
    return this.api.delete(`expenses/${id}`);
  }
}
