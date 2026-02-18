import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export type CategoryType = 'expense' | 'income' | 'debt_loan';

export interface CategoryTreeNode {
  id: number;
  type: CategoryType;
  name: string;
  icon: string | null;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
  children: CategoryTreeNode[];
}

export interface CategoryTreeResponse {
  data: CategoryTreeNode[];
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  constructor(private api: ApiService) {}

  getTree(type?: CategoryType) {
    const query = type ? `?type=${type}` : '';
    return this.api.get<CategoryTreeResponse>(`categories/tree${query}`);
  }
}
