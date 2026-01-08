import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../Services/auth/auth.service';
import { inject } from '@angular/core';
import { map, Observable } from 'rxjs';

export const LandingGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isLoggedIn$.pipe(
    map(isLoggedIn => {
      if(!isLoggedIn){
        return true; // show landing page if NOT logged in
      } else {
        return router.createUrlTree(['/home']); // redirect logged-in users
      }
    })
  );
}
