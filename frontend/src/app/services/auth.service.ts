import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Storage } from '@ionic/storage-angular';
import { firstValueFrom } from 'rxjs';
import { from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';

interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role?: string;
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
      switchMap((response) =>
        from(this.setToken(response.access_token)).pipe(map(() => response))
      )
    );
  }

  googleLogin(token: string) {
    return this.api.post<AuthResponse>('auth/google', { token }).pipe(
      switchMap((response) =>
        from(this.setToken(response.access_token)).pipe(map(() => response))
      )
    );
  }

  register(payload: { name: string; email: string; password: string; password_confirmation: string }) {
    return this.api.post<AuthResponse>('auth/register', payload).pipe(
      switchMap((response) =>
        from(this.setToken(response.access_token)).pipe(map(() => response))
      )
    );
  }

  logout() {
    return this.api.post<{ message: string }>('auth/logout', {}).pipe(
      switchMap((response) => from(this.clearToken()).pipe(map(() => response)))
    );
  }

  me() {
    return this.api.get<CurrentUser>('auth/me');
  }

  async setToken(token: string): Promise<void> {
    await this.storageReady;
    const normalizedToken = this.normalizeToken(token);
    if (!normalizedToken) {
      await this.storage.remove(this.tokenKey);
      return;
    }

    await this.storage.set(this.tokenKey, normalizedToken);
  }

  async getToken(): Promise<string | null> {
    await this.storageReady;
    const storedToken = await this.storage.get(this.tokenKey);
    return this.normalizeToken(storedToken);
  }

  async clearToken(): Promise<void> {
    await this.storageReady;
    await this.storage.remove(this.tokenKey);
  }

  async isLoggedIn(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) {
      return false;
    }

    try {
      return !this.jwtHelper.isTokenExpired(token);
    } catch {
      await this.clearToken();
      return false;
    }
  }

  async hasValidSession(): Promise<boolean> {
    const isTokenValid = await this.isLoggedIn();
    if (!isTokenValid) {
      return false;
    }

    try {
      await firstValueFrom(this.me());
      return true;
    } catch {
      await this.clearToken();
      return false;
    }
  }

  private normalizeToken(rawToken: unknown): string | null {
    if (!rawToken) {
      return null;
    }

    if (typeof rawToken === 'string') {
      const token = rawToken.trim().replace(/^Bearer\s+/i, '');
      if (!token) {
        return null;
      }

      if ((token.startsWith('{') && token.endsWith('}')) || (token.startsWith('"') && token.endsWith('"'))) {
        try {
          const parsed = JSON.parse(token);
          return this.normalizeToken(parsed);
        } catch {
          return token;
        }
      }

      return token;
    }

    if (typeof rawToken === 'object') {
      const tokenRecord = rawToken as Record<string, unknown>;
      const nested = tokenRecord['access_token'] ?? tokenRecord['token'] ?? tokenRecord['value'];
      return this.normalizeToken(nested);
    }

    return null;
  }
}
