import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../Services/auth/auth.service';

export const CommitteeGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isCommitteeMember()) {
        return true;
    }

    return router.createUrlTree(['/groups']);
};
