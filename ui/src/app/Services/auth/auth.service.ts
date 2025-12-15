import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Registration } from '../../Interfaces/Registration/registration-interface';
import { Login } from '../../Interfaces/Login/login-interface';
import { ApiResponse } from '../../Interfaces/Api-Response/api-response';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment.prod';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  router = inject(Router);

  private readonly authUrl = environment.apiUrl;

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

  logout(): Observable<any>{
    console.log("User logging out...")

    return this.http.post<ApiResponse>(`${this.authUrl}/logout`, {}).pipe(
      tap(()=>{

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('refreshTokenExpiry');

        this._isLoggedIn.next(false);

        this.router.navigate(['/']);
      }),
      catchError((error: HttpErrorResponse)=>{
        
        if(error.status == 401 || error.status == 403 || error.status == 400){

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