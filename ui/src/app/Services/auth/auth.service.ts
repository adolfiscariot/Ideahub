import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
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

  // ===== EXISTING METHODS =====

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
    console.log(`${loginData.email} is logging in...`);

    return this.http.post<ApiResponse>(`${this.authUrl}/login`, loginData).pipe(
      tap((response) => {
        if (response.status && response.data?.accessToken) {
          console.log('Login successful: ', response);

          localStorage.setItem('accessToken', response.data.accessToken);
          localStorage.setItem('refreshToken', response.data.refreshToken);
          localStorage.setItem(
            'refreshTokenExpiry',
            response.data.refreshTokenExpiry
          );

          this._isLoggedIn.next(true);
        } else {
          console.error('Login failed: ', response.message);
          throw new Error(response.message || 'Login failed');
        }
      }),
      catchError((e) => {
        console.error(`Login failed: ${e.message}`);
        throw new Error(`Login failed: ${e.message}`);
      })
    );
  }

  logout(): Observable<any>{
    console.log("User logging out...")

    return this.http.post<ApiResponse>(`${this.authUrl}/logout`, {}).pipe(
      tap(()=>{
        console.log("User logged out successfully");

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('refreshTokenExpiry');

        this._isLoggedIn.next(false);

        this.router.navigate(['/']);
      }),
      catchError((error: HttpErrorResponse)=>{
        console.error(`Logout failed: ${error}`);
        
        if(error.status == 401 || error.status == 403 || error.status == 400){
          console.error("Clearing local tokens due to failed logout/invalid token");

          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('refreshTokenExpiry');

          this._isLoggedIn.next(false);
          this.router.navigate(['/']);
        }
        return throwError(() => new Error(`Status: ${error.status}, Message: ${error.message || 'Unknown error'}`))
      })
    )
  }

  // ===== NEW METHODS FOR PERMISSION CHECKING =====

  // Check if user is logged in
  isLoggedIn(): boolean {
    const token = localStorage.getItem('accessToken');
    return !!token;
  }

  // Get current user (simplified - you'll need to store user data on login)
  getCurrentUser(): any {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;
    
    // Decode JWT token to get user info (simplified)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.sub || payload.nameid,
        email: payload.email,
        roles: payload.role || [] // Assuming roles are in the token
      };
    } catch {
      return null;
    }
  }

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