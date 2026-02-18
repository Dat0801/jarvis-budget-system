import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AccountService {
  constructor(private api: ApiService) {}

  resetData() {
    return this.api.post<{ message: string }>('account/reset-data', {});
  }
}
