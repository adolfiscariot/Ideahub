import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, tap, throwError, switchMap } from 'rxjs';
import { inject } from '@angular/core';
import { AuthService } from '../../Services/auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  console.log("Interceptor working");
  const accessToken = localStorage.getItem('accessToken');
  const authService = inject(AuthService);

  // Clone request with header if token exists
  let newRequest = req;
  if (accessToken) {
    newRequest = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${accessToken}`)
    });
  }

  return next(newRequest).pipe(
    tap((event) => {
      // Log successful responses if needed
    }),
    catchError((error: HttpErrorResponse) => {

      // Handle 401 Unauthorized
      if (error.status === 401) {

        // Ignore 401 on Login (invalid credentials) -> just return error
        if (req.url.includes('/login')) {
          return throwError(() => error);
        }

        // If 401 on Logout -> just logout locally
        if (req.url.includes('/logout')) {
          authService.logoutLocal();
          return throwError(() => error);
        }

        // If 401 on Refresh Token -> Refresh failed, force logout
        if (req.url.includes('/refresh-token')) {
          authService.logoutLocal();
          return throwError(() => error);
        }

        // For other requests, attempt to Refresh Token
        console.warn("Unauthorized request - attempting token refresh");

        return authService.refreshToken().pipe(
          switchMap(() => {
            // Refresh successful, retry original request with new token
            const newToken = localStorage.getItem('accessToken');
            const retriedRequest = req.clone({
              headers: req.headers.set('Authorization', `Bearer ${newToken}`)
            });
            return next(retriedRequest);
          }),
          catchError((refreshError) => {
            // Refresh failed, logout
            console.error("Token refresh failed in interceptor", refreshError);
            authService.logoutLocal();
            return throwError(() => refreshError);
          })
        );
      }

      console.error(`Request to ${newRequest.urlWithParams} failed`, error);
      return throwError(() => error);
    })
  );
};
