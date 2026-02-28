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
  jars?: { id: number; name: string }[];
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

  create(payload: {
    type: CategoryType;
    name: string;
    icon?: string;
    parent_id?: number;
    jar_ids?: number[];
  }) {
    return this.api.post<CategoryTreeNode>('categories', payload);
  }

  update(id: number, payload: {
    type?: CategoryType;
    name?: string;
    icon?: string;
    parent_id?: number;
    jar_ids?: number[];
    is_active?: boolean;
  }) {
    return this.api.patch<CategoryTreeNode>(`categories/${id}`, payload);
  }

  delete(id: number) {
    return this.api.delete<{ message: string }>(`categories/${id}`);
  }
}
