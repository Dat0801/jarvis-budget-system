import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface Jar {
  id: number;
  name: string;
  balance: string;
  description?: string | null;
}

@Injectable({ providedIn: 'root' })
export class JarService {
  constructor(private api: ApiService) {}

  list() {
    return this.api.get<Jar[]>('jars');
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
}
