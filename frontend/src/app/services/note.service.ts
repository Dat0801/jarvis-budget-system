import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface Note {
  id: number;
  title: string;
  body?: string | null;
  reminder_date?: string | null;
  is_notified?: boolean;
}

@Injectable({ providedIn: 'root' })
export class NoteService {
  constructor(private api: ApiService) {}

  list() {
    return this.api.get<Note[]>('notes');
  }

  create(payload: { title: string; body?: string; reminder_date?: string }) {
    return this.api.post<Note>('notes', payload);
  }

  update(id: number, payload: Partial<Note>) {
    return this.api.patch<Note>(`notes/${id}`, payload);
  }

  remove(id: number) {
    return this.api.delete<{ message: string }>(`notes/${id}`);
  }
}
