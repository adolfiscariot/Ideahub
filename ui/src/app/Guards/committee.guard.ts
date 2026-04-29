import { inject } from '@angular/core';
import { Router, CanActivateFn, UrlTree } from '@angular/router';
import { AuthService } from '../Services/auth/auth.service';
import { Observable, map } from 'rxjs';

export const CommitteeGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isCommitteeMember().pipe(
    map((isMember: boolean) => {
      if (isMember) {
        return true;
      }

      return router.createUrlTree(['/groups']);
    })
  );
};
