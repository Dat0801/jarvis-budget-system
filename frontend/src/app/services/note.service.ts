import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface Note {
  id: number;
  type: 'general' | 'debt';
  title: string;
  debtor_name?: string | null;
  amount?: number | null;
  interest_rate?: number | null;
  interest_amount?: number | null;
  body?: string | null;
  reminder_date?: string | null;
  is_notified?: boolean;
  is_completed?: boolean;
}

@Injectable({ providedIn: 'root' })
export class NoteService {
  constructor(private api: ApiService) {}

  list() {
    return this.api.get<Note[]>('notes');
  }

  show(id: number) {
    return this.api.get<Note>(`notes/${id}`);
  }

  reminderCount() {
    return this.api.get<{ count: number }>('notes/reminders/count');
  }

  dueReminders() {
    return this.api.get<Note[]>('notes/reminders/due');
  }

  create(payload: {
    type?: 'general' | 'debt';
    title: string;
    debtor_name?: string;
    amount?: number;
    interest_rate?: number;
    body?: string;
    reminder_date?: string;
  }) {
    return this.api.post<Note>('notes', payload);
  }

  update(id: number, payload: Partial<Note>) {
    return this.api.patch<Note>(`notes/${id}`, payload);
  }

  remove(id: number) {
    return this.api.delete<{ message: string }>(`notes/${id}`);
  }
}
