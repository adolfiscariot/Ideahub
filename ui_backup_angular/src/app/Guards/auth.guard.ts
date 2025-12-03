import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../Services/auth/auth.service';
import { inject } from '@angular/core';
import { map, Observable } from 'rxjs';

export const AuthGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isLoggedIn$.pipe(
    map(isLoggedIn => {
      if(isLoggedIn){
        return true
      }else{
        return router.createUrlTree(['/login'])
      }
    })
  )

}