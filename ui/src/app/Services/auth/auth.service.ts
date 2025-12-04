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

  private readonly authUrl = 'http://localhost:5066/api/auth';

  private _isLoggedIn = new BehaviorSubject<boolean>(false);
  isLoggedIn$: Observable<boolean> = this._isLoggedIn.asObservable();

  constructor(private http: HttpClient) {
    //Without this, reloading the page resets _isLoggedIn to false 
    //despite the user being logged in
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
    console.log(`${loginData.email} is logging in...`);

    return this.http.post<ApiResponse>(`${this.authUrl}/login`, loginData).pipe(
      tap((response) => {
        //If status is true i.e. login was successful,store the tokens
        //and change _isLoggedIn behaviorSubject to true
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

  logout(): Observable<any> {
    console.log("User logging out...")

    return this.http.post<ApiResponse>(`${this.authUrl}/logout`, {}).pipe(
      tap(() => {
        console.log("User logged out successfully");

        //Delete access token, refresh token and refresh token expiry
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('refreshTokenExpiry');

        //change _isLogged in state to false
        this._isLoggedIn.next(false);

        //Redirect user to landing page
        this.router.navigate(['/']);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error(`Logout failed: ${error}`);

        if (error.status == 401 || error.status == 403 || error.status == 400) {
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
}
