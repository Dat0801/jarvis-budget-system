import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class IncomeService {
  constructor(private api: ApiService) {}

  list() {
    return this.api.get('incomes');
  }

  detail(id: number) {
    return this.api.get(`incomes/${id}`);
  }

  create(payload: { jar_id: number; amount: number; source?: string; received_at?: string }) {
    return this.api.post('incomes', payload);
  }

  update(id: number, payload: { source?: string; received_at?: string }) {
    return this.api.patch(`incomes/${id}`, payload);
  }

  remove(id: number) {
    return this.api.delete(`incomes/${id}`);
  }
}
