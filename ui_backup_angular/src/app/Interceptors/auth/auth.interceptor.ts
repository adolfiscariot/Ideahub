import {HttpEvent, HttpEventType, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  console.log("Interceptor working");
  const accessToken = localStorage.getItem('accessToken');

  //If accessToken is not null clone the request and 
  if(accessToken){
    const newRequest = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${accessToken}`)
    });
      
    return next(newRequest).pipe(
      tap(
        (event) => {
          if (event.type === HttpEventType.Response){
            console.log(`Request to ${newRequest.urlWithParams} completed with status ${event.status}`);
          }
        }
      ),
      catchError((e) => {
        console.error(`Request to ${newRequest.urlWithParams} failed with error ${e}`);
        return throwError(()=>e.errors);
      })
    );
  }
  
  //if accessToken is null just pass the original request
  return next(req); 
};
