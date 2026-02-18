import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface AccountProfile {
  id: number;
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  constructor(private api: ApiService) {}

  updateProfile(payload: { name: string; email: string }) {
    return this.api.patch<AccountProfile>('account/profile', payload);
  }

  updatePassword(payload: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) {
    return this.api.patch<{ message: string }>('account/password', payload);
  }

  resetData() {
    return this.api.post<{ message: string }>('account/reset-data', {});
  }
}
