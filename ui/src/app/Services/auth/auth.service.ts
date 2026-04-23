import { inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  throwError,
  of,
  Subscription,
  timer,
} from 'rxjs';
import { catchError, tap, finalize, filter, take, map } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Registration } from '../../Interfaces/Registration/registration-interface';
import { Login } from '../../Interfaces/Login/login-interface';
import { ApiResponse } from '../../Interfaces/Api-Response/api-response';
import { ForgotPassword } from '../../Interfaces/Auth/forgot-password-interface';
import { ResetPassword } from '../../Interfaces/Auth/reset-password-interface';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthData, CurrentUser } from '../../Interfaces/Auth/auth-interfaces';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  router = inject(Router);

  private readonly authUrl = `${environment.apiUrl}/auth`;

  private _isLoggedIn = new BehaviorSubject<boolean>(false);
  isLoggedIn$: Observable<boolean> = this._isLoggedIn.asObservable();

  private _passwordSetupRequired = new BehaviorSubject<boolean>(false);
  passwordSetupRequired$: Observable<boolean> = this._passwordSetupRequired.asObservable();

  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> =
    new BehaviorSubject<string | null>(null);
  private refreshSubscription?: Subscription;

  private http = inject(HttpClient);

  constructor() {
    const token = localStorage.getItem('accessToken');
    this._isLoggedIn.next(!!token);

    const psr = localStorage.getItem('passwordSetupRequired');
    this._passwordSetupRequired.next(psr === 'true');

    if (token) {
      this.setupRefreshTimer();
    }
  }

  private convertResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
    return {
      success: response.status || response.success || false,
      message: response.message || '',
      data: response.data,
    };
  }

  setAuthData(data: AuthData): void {
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      this._isLoggedIn.next(true);

      if (data.passwordSetupRequired !== undefined) {
        localStorage.setItem('passwordSetupRequired', data.passwordSetupRequired.toString());
        this._passwordSetupRequired.next(data.passwordSetupRequired);
      }

      this.setupRefreshTimer();
    }
  }

  setAuthData(data: AuthData): void {
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      this._isLoggedIn.next(true);

      if (data.passwordSetupRequired !== undefined) {
        localStorage.setItem('passwordSetupRequired', data.passwordSetupRequired.toString());
        this._passwordSetupRequired.next(data.passwordSetupRequired);
      }

      this.setupRefreshTimer();
    }
  }

  register(registrationData: Registration): Observable<ApiResponse<void>> {
    return this.http
      .post<ApiResponse<void>>(`${this.authUrl}/register`, registrationData)
      .pipe(
        map((response) => this.convertResponse<void>(response)),
        catchError((e) => {
          const errorMessage =
            e.error?.message || e.message || 'Registration failed';
          throw new Error(errorMessage);
        }),
      );
  }

  login(loginData: Login): Observable<ApiResponse<AuthData>> {
    return this.http
      .post<
        ApiResponse<AuthData>
      >(`${this.authUrl}/login`, loginData, { withCredentials: true })
      .pipe(
        map((response) => this.convertResponse<AuthData>(response)),
        tap((response) => {
          if (response.success && response.data?.accessToken) {
            localStorage.setItem('accessToken', response.data.accessToken);
            this._isLoggedIn.next(true);
            this.setupRefreshTimer();
          } else {
            throw new Error(response.message || 'Login failed');
          }
        }),
        catchError((e) => {
          const errorMessage = e.error?.message || e.message || 'Login failed';
          throw new Error(errorMessage);
        }),
      );
  }

  logout(): Observable<ApiResponse<void> | boolean> {
    // Check local token status
    const token = localStorage.getItem('accessToken');
    if (!token) {
      this.logoutLocal();
      return of(true);
    }

    // 2. Attempt server-side logout
    return this.http
      .post<
        ApiResponse<void>
      >(`${this.authUrl}/logout`, {}, { withCredentials: true })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => error);
        }),
        // 3. Always clean up locally, regardless of server response
        finalize(() => {
          this.logoutLocal();
        }),
      );
  }

  /**
   * Refreshes the JWT access token using the refresh token.
   * If successful, updates local storage with new tokens and keeps user logged in.
   * If failed, logs the user out locally.
   * @returns Observable of the refresh response
   */
  /**
   * Refreshes the JWT access token using the refresh token (from cookie).
   * Handles concurrent refreshes by queuing subsequent requests.
   */
  refreshToken(): Observable<string> {
    if (this.isRefreshing) {
      // If a refresh is already in progress, wait for it to complete
      return this.refreshTokenSubject.pipe(
        filter((token) => token != null),
        take(1),
      );
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      this.isRefreshing = false;
      this.logoutLocal();
      return throwError(() => new Error('No access token found'));
    }

    const payload = { accessToken, refreshToken: 'cookie' };

    return this.http
      .post<AuthData>(`${this.authUrl}/refresh-token`, payload, {
        withCredentials: true,
      })
      .pipe(
        map((response) => {
          const newAccessToken = response.accessToken;
          if (newAccessToken) {
            localStorage.setItem('accessToken', newAccessToken);
            this._isLoggedIn.next(true);
            this.refreshTokenSubject.next(newAccessToken);
            this.setupRefreshTimer();
            return newAccessToken;
          } else {
            this.logoutLocal();
            throw new Error('No access token in response');
          }
        }),
        catchError((error) => {
          this.refreshTokenSubject.next(null); //Signal failure without breaking subject
          this.logoutLocal();
          return throwError(() => error);
        }),
        finalize(() => {
          this.isRefreshing = false;
        }),
      );
  }

  /**
   * Performs local cleanup of auth state (tokens, subject) and redirects to login.
   * Public to allow Interceptor to trigger logout on critical failures (e.g. failed refresh).
   */
  public logoutLocal() {
    this.clearRefreshTimer();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refreshTokenExpiry');
    localStorage.removeItem('passwordSetupRequired');
    this._isLoggedIn.next(false);
    this._passwordSetupRequired.next(false);
    // Note: HttpOnly cookie can only be cleared by the server during /logout
    this.router.navigate(['/login']);
  }

  /**
   * Schedules an automatic token refresh before the current one expires.
   */
  private setupRefreshTimer() {
    this.clearRefreshTimer();

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return;

      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return;

      const expiresAt = payload.exp * 1000;
      const timeout = expiresAt - Date.now() - 60000; // Refresh 1 minute before expiry

      if (timeout > 0) {
        this.refreshSubscription = timer(timeout).subscribe(() => {
          this.refreshToken().subscribe({
            error: () => this.logoutLocal(),
          });
        });
      } else {
        // Token is already very close to expiry or expired, refresh now
        this.refreshToken().subscribe({
          error: () => this.logoutLocal(),
        });
      }
    } catch {
      // If parsing fails, we don't schedule a refresh
    }
  }

  /**
   * Clears any active background refresh timer.
   */
  private clearRefreshTimer() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
  }

  // ===== PERMISSION CHECKING METHODS =====

  /**
   * Validates the structure and expiry of the current access token.
   * @returns true if token exists, is well-formed, and has not expired.
   */
  private isTokenValid(): boolean {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false; // Malformed token
      }

      const payload = JSON.parse(atob(parts[1]));

      if (!payload.exp) {
        return false; // Treat missing expiry as invalid for security
      }

      const expiry = payload.exp * 1000;
      return Date.now() < expiry;
    } catch {
      return false; // Invalid token format
    }
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    const token = localStorage.getItem('accessToken');
    return !!token;
  }

  // Get current user
  getCurrentUser(): CurrentUser | null {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      const userId =
        payload.sub ||
        payload.nameid ||
        payload[
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'
        ];

      return {
        id: userId,
        email:
          payload.email ||
          payload[
            'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
          ],
        roles: (() => {
          const r =
            payload.role ||
            payload[
              'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
            ] ||
            [];
          return Array.isArray(r) ? r : [r];
        })(),
      };
    } catch {
      return null;
    }
  }

  ///======= IS THIS NECESSARY? =======
  // Get user roles from token
  getCurrentUserRoles(): string[] {
    const user = this.getCurrentUser();
    return user?.roles || [];
  }

  // Check if user has a specific role
  hasRole(roleName: string): boolean {
    const roles = this.getCurrentUserRoles();
    // Check both exact match and case-insensitive
    return roles.some(
      (role) =>
        role === roleName || role.toLowerCase() === roleName.toLowerCase(),
    );
  }

  // Check if user is SuperAdmin
  isSuperAdmin(): boolean {
    return this.hasRole('SuperAdmin') || this.hasRole('SUPERADMIN');
  }

  // Check if user is GroupAdmin
  isGroupAdmin(): boolean {
    return this.hasRole('GroupAdmin') || this.hasRole('GROUPADMIN');
  }

  // Check if user is RegularUser
  isRegularUser(): boolean {
    return this.hasRole('RegularUser') || this.hasRole('REGULARUSER');
  }

  // Check if user is CommitteeMember
  isCommitteeMember(): boolean {
    return this.hasRole('CommitteeMember') || this.hasRole('COMMITTEEMEMBER');
  }

  // Check if user has any of the given roles
  hasAnyRole(roleNames: string[]): boolean {
    return roleNames.some((roleName) => this.hasRole(roleName));
  }

  // Get current user ID
  getCurrentUserId(): string {
    const user = this.getCurrentUser();
    return user?.id || '';
  }

  // Helper alias for getUserId
  getUserId(): string {
    return this.getCurrentUserId();
  }

  // Get current user Email
  getEmail(): string {
    const user = this.getCurrentUser();
    return user?.email || '';
  }

  forgotPassword(payload: ForgotPassword): Observable<ApiResponse<void>> {
    return this.http
      .post<ApiResponse<void>>(`${this.authUrl}/forgot-password`, payload)
      .pipe(map((response) => this.convertResponse<void>(response)));
  }

  validateResetCode(code: string): Observable<ApiResponse<void>> {
    return this.http
      .post<ApiResponse<void>>(`${this.authUrl}/validate-reset-code`, { code })
      .pipe(map((response) => this.convertResponse<void>(response)));
  }

  resetPassword(payload: ResetPassword): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(
      `${this.authUrl}/reset-password`,
      payload
    ).pipe(map(response => this.convertResponse<void>(response)));
  }

  setInitialPassword(password: string): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.authUrl}/set-initial-password`, { newPassword: password, confirmPassword: password }).pipe(
      map(response => this.convertResponse<void>(response)),
      tap(response => {
        if (response.success) {
          localStorage.removeItem('passwordSetupRequired');
          this._passwordSetupRequired.next(false);
        }
      }),
      catchError((e) => {
        const apiError = e.error as ApiResponse<void>;
        let errorMessage = apiError?.message || e.message || 'Failed to set password';

        if (apiError?.errors && apiError.errors.length > 0) {
          errorMessage = apiError.errors[0];
        }

        throw new Error(errorMessage);
      })
    );
  }
}