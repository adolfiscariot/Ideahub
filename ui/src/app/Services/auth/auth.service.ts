import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { catchError, tap, finalize } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Registration } from '../../Interfaces/Registration/registration-interface';
import { Login } from '../../Interfaces/Login/login-interface';
import { ApiResponse } from '../../Interfaces/Api-Response/api-response';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  router = inject(Router);

  private readonly authUrl = 'http://localhost:5065/api/auth';

  private _isLoggedIn = new BehaviorSubject<boolean>(false);
  isLoggedIn$: Observable<boolean> = this._isLoggedIn.asObservable();

  constructor(private http: HttpClient) {
    const token = localStorage.getItem('accessToken');
    this._isLoggedIn.next(!!token);
  }

  register(registrationData: Registration): Observable<any> {
    console.log('Registration taking place...');

    return this.http.post(`${this.authUrl}/register`, registrationData).pipe(
      tap((response) => {
        console.log(
          `${registrationData.email} has registered successfully: `,
          response
        );
      }),
      catchError((e) => {
        throw new Error(`Registration failed: ${e}`);
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
        throw new Error(`Login failed: ${e.message}`);
      })
    );
  }

  logout(): Observable<any> {
    console.log("User logging out...");

    // 1. Check if token is invalid/expired before sending request
    if (!this.isTokenValid()) {
      console.log("Token expired or invalid, performing local logout only.");
      this.performLocalLogout();
      return of(true); // Return instant success
    }

    // 2. Attempt server-side logout
    return this.http.post<ApiResponse>(`${this.authUrl}/logout`, {}).pipe(
      tap(() => {
        console.log("Server logout successful");
      }),
      catchError((error: HttpErrorResponse) => {
        console.error("Server logout failed, forcing local logout", error);
        // Even if server fails, we continue to finally block
        return throwError(() => error);
      }),
      // 3. Always clean up locally, regardless of server response
      finalize(() => {
        this.performLocalLogout();
      })
    );
  }

  // Helper to perform local cleanup
  performLocalLogout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refreshTokenExpiry');
    this._isLoggedIn.next(false);
    this.router.navigate(['/']); // Redirect to landing/login
  }

  // Helper to check token validity
  private isTokenValid(): boolean {
    const token = localStorage.getItem('accessToken');
    if (!token) return false;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false; // Malformed token
      }

      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return true; // No expiry? assume valid or let backend decide

      const expiry = payload.exp * 1000;
      return Date.now() < expiry;
    } catch (e) {
      return false; // Invalid token format
    }
  }

  // ===== PERMISSION CHECKING METHODS =====

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
}