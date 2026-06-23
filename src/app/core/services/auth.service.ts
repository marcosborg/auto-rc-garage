import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MobileUser } from '../models/workshop.models';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(TokenStorageService);

  readonly user = signal<MobileUser | null>(this.storage.getUser<MobileUser>());

  login(email: string, password: string): Observable<MobileUser> {
    return this.http
      .post<{ token: string; user: MobileUser }>(`${environment.apiBaseUrl}/mobile/auth/login`, {
        email,
        password,
        device_name: 'ionic-android',
      })
      .pipe(
        tap((response) => {
          this.storage.setToken(response.token);
          this.storage.setUser(response.user);
          this.user.set(response.user);
        }),
        map((response) => response.user),
      );
  }

  me(): Observable<MobileUser> {
    return this.http
      .get<{ user: MobileUser }>(`${environment.apiBaseUrl}/mobile/auth/me`)
      .pipe(
        map((response) => response.user),
        tap((user) => {
          this.storage.setUser(user);
          this.user.set(user);
        }),
      );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/mobile/auth/logout`, {}).pipe(
      tap(() => {
        this.storage.clearAll();
        this.user.set(null);
      }),
    );
  }

  clearSession(): void {
    this.storage.clearAll();
    this.user.set(null);
  }

  isLoggedIn(): boolean {
    return !!this.storage.getToken();
  }
}
