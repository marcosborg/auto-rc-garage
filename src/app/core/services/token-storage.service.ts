import { Injectable } from '@angular/core';

const TOKEN_KEY = 'autorc_mobile_token';
const USER_KEY = 'autorc_mobile_user';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  setUser(user: unknown): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  getUser<T>(): T | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  clearUser(): void {
    localStorage.removeItem(USER_KEY);
  }

  clearAll(): void {
    this.clearToken();
    this.clearUser();
  }
}
