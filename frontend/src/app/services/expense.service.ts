import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  constructor(private api: ApiService) {}

  create(payload: { jar_id: number; amount: number; category?: string; note?: string; spent_at?: string }) {
    return this.api.post('expenses', payload);
  }
}
