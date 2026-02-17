import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Storage } from '@ionic/storage-angular';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';

interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'auth_token';
  private storageReady: Promise<Storage>;
  private jwtHelper = new JwtHelperService();

  constructor(private api: ApiService, private storage: Storage) {
    this.storageReady = this.storage.create();
  }

  login(payload: { email: string; password: string }) {
    return this.api.post<AuthResponse>('auth/login', payload).pipe(
      tap((response) => this.setToken(response.access_token))
    );
  }

  register(payload: { name: string; email: string; password: string; password_confirmation: string }) {
    return this.api.post<AuthResponse>('auth/register', payload).pipe(
      tap((response) => this.setToken(response.access_token))
    );
  }

  async setToken(token: string): Promise<void> {
    await this.storageReady;
    await this.storage.set(this.tokenKey, token);
  }

  async getToken(): Promise<string | null> {
    await this.storageReady;
    return this.storage.get(this.tokenKey);
  }

  async logout(): Promise<void> {
    await this.storageReady;
    await this.storage.remove(this.tokenKey);
  }

  async isLoggedIn(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) {
      return false;
    }

    return !this.jwtHelper.isTokenExpired(token);
  }
}
