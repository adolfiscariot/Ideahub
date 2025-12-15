import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';
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
      // if (event.type === HttpEventType.Response) { ... }
    }),
    catchError((error: HttpErrorResponse) => {
      console.error(`Request to ${newRequest.urlWithParams} failed`, error);

      // Global 401 handling
      if (error.status === 401) {
        console.warn("Unauthorized request - handling token expiration");
        authService.performLocalLogout();
      }

      return throwError(() => error);
    })
  );
};
