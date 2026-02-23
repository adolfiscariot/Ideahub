import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, tap, finalize } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Registration } from '../../Interfaces/Registration/registration-interface';
import { Login } from '../../Interfaces/Login/login-interface';
import { ApiResponse } from '../../Interfaces/Api-Response/api-response';
import { ForgotPassword } from '../../Interfaces/Auth/forgot-password-interface';
import { ResetPassword } from '../../Interfaces/Auth/reset-password-interface';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  router = inject(Router);

  private readonly authUrl = 'http://localhost:5065/api/auth';

  private _isLoggedIn = new BehaviorSubject<boolean>(false);
  isLoggedIn$: Observable<boolean> = this._isLoggedIn.asObservable();

  private http = inject(HttpClient);

  constructor() {
    const token = localStorage.getItem('accessToken');
    this._isLoggedIn.next(!!token);
  }

  register(registrationData: Registration): Observable<any> {

    return this.http.post(`${this.authUrl}/register`, registrationData).pipe(
      tap((response) => {
        // console.log(
        //   `${registrationData.email} has registered successfully: `,
        //   response
        // );
      }),
      catchError((e) => {
        const errorMessage = e.error?.message || e.message || 'Registration failed';
        throw new Error(errorMessage);
      })
    );
  }

  login(loginData: Login): Observable<any> {

    return this.http.post<ApiResponse>(`${this.authUrl}/login`, loginData).pipe(
      tap((response) => {
        if (response.status && response.data?.accessToken) {

          localStorage.setItem('accessToken', response.data.accessToken);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          localStorage.setItem(
            'refreshTokenExpiry',
            response.data.refreshTokenExpiry
          );

          this._isLoggedIn.next(true);
        } else {
          throw new Error(response.message || 'Login failed');
        }
      }),
      catchError((e) => {
        const errorMessage = e.error?.message || e.message || 'Login failed';
        throw new Error(errorMessage);
      })
    );
  }

  logout(): Observable<any> {

    // 1. Check if token is invalid/expired before sending request
    if (!this.isTokenValid()) {
      this.logoutLocal();
      return of(true); // Return instant success
    }

    // 2. Attempt server-side logout
    return this.http.post<ApiResponse>(`${this.authUrl}/logout`, {}).pipe(
      tap(() => {
      }),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      }),
      // 3. Always clean up locally, regardless of server response
      finalize(() => {
        this.logoutLocal();
      })
    );
  }

  /**
   * Refreshes the JWT access token using the refresh token.
   * If successful, updates local storage with new tokens and keeps user logged in.
   * If failed, logs the user out locally.
   * @returns Observable of the refresh response
   */
  refreshToken(): Observable<any> {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!accessToken || !refreshToken) {
      this.logoutLocal();
      return throwError(() => new Error('No tokens found'));
    }

    const payload = {
      accessToken,
      refreshToken
    };

    return this.http.post<any>(`${this.authUrl}/refresh-token`, payload).pipe(
      tap((response) => {
        // Handle backend returning { AccessToken: ..., RefreshToken: ... } directly
        // usually ASP.NET Core serializes to camelCase, check both just in case
        const newAccessToken = response.accessToken || response.AccessToken;
        const newRefreshToken = response.refreshToken || response.RefreshToken;

        if (newAccessToken && newRefreshToken) {
          localStorage.setItem('accessToken', newAccessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          // Backend might not return expiry in refresh, calculate or assume valid
          this._isLoggedIn.next(true);
        } else {}
      }),
      catchError((error) => {
        this.logoutLocal();
        return throwError(() => error);
      })
    );
  }

  /**
   * Performs local cleanup of auth state (tokens, subject) and redirects to login.
   * Public to allow Interceptor to trigger logout on critical failures (e.g. failed refresh).
   */
  public logoutLocal() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refreshTokenExpiry');
    this._isLoggedIn.next(false);
    this.router.navigate(['/']);
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
    } catch (e) {
      return false; // Invalid token format
    }
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    const token = localStorage.getItem('accessToken');
    return !!token;
  }

  // Get current user
  getCurrentUser(): any {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      const userId =
        payload.sub ||
        payload.nameid ||
        payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];

      return {
        id: userId,
        email:
          payload.email ||
          payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"],
        roles:
          payload.role ||
          payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
          []
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
    return roles.some(role =>
      role === roleName ||
      role.toLowerCase() === roleName.toLowerCase()
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

  // Check if user has any of the given roles
  hasAnyRole(roleNames: string[]): boolean {
    return roleNames.some(roleName => this.hasRole(roleName));
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

  forgotPassword(payload: ForgotPassword): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.authUrl}/forgot-password`,
      payload
    );
  }

  validateResetCode(code: string): Observable<any> {
    return this.http.post<any>(
      `${this.authUrl}/validate-reset-code`,
      { code }
    );
  }

  resetPassword(payload: ResetPassword): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.authUrl}/reset-password`,
      payload
    );
  }
}