import { inject, Injectable } from '@angular/core';
import { AuthService as Auth0Service, User } from '@auth0/auth0-angular';
import {
  Observable,
  map,
  of,
  switchMap,
  from,
  catchError,
  shareReplay,
} from 'rxjs';
import {
  CurrentUser,
  ProfileResponse,
} from '../../Interfaces/Auth/auth-interfaces';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly auth0 = inject(Auth0Service);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:5065/api/auth';

  /**
   * Public observables for application state
   */
  public readonly isLoggedIn$: Observable<boolean> =
    this.auth0.isAuthenticated$;
  public readonly user$: Observable<User | null | undefined> = this.auth0.user$;
  public readonly isLoading$: Observable<boolean> = this.auth0.isLoading$;

  /**
   * Cache for the local user profile to avoid repeated API calls
   */
  private localUserCache$: Observable<CurrentUser | null> | null = null;

  /**
   * Triggers the Auth0 Login redirect
   */
  public login(): void {
    this.auth0.loginWithRedirect();
  }

  /**
   * Triggers the Auth0 Signup redirect
   */
  public signUp(): void {
    this.auth0.loginWithRedirect({
      authorizationParams: {
        screen_hint: 'signup',
      },
    });
  }

  /**
   * Triggers the Auth0 Logout
   */
  public logout(): void {
    this.localUserCache$ = null;
    this.auth0.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }

  /**
   * Fetches the local DB profile using getAccessTokenSilently() to ensure
   * the token is always attached before calling the backend.
   */
  public getCurrentUser(): Observable<CurrentUser | null> {
    return this.isLoggedIn$.pipe(
      switchMap((isLoggedIn) => {
        if (!isLoggedIn) {
          this.localUserCache$ = null;
          return of(null);
        }

        if (this.localUserCache$) {
          return this.localUserCache$;
        }

        // Use getAccessTokenSilently() to guarantee the token is ready,
        // then manually attach it to the profile request.
        this.localUserCache$ = from(
          this.auth0.getAccessTokenSilently({
            authorizationParams: {
              audience: 'https://api.ideahub',
              scope: 'openid profile email',
            },
          }),
        ).pipe(
          switchMap((token) => {
            const headers = new HttpHeaders({
              Authorization: `Bearer ${token}`,
            });
            return this.http.get<ProfileResponse>(`${this.apiUrl}/profile`, {
              headers,
            });
          }),
          map((response) => {
            if (response?.status && response?.data) {
              return {
                id: response.data.id,
                email: response.data.email,
                roles: response.data.roles || [],
              } as CurrentUser;
            }
            return null;
          }),
          catchError(() => of(null)),
          shareReplay(1),
        );

        return this.localUserCache$;
      }),
    );
  }

  /**
   * Checks if the user possesses a specific role
   */
  public hasRole(roleName: string): Observable<boolean> {
    return this.getCurrentUser().pipe(
      map((user: CurrentUser | null): boolean => {
        if (!user) {
          return false;
        }
        return user.roles.some(
          (role: string) =>
            role === roleName || role.toLowerCase() === roleName.toLowerCase(),
        );
      }),
    );
  }

  // Role-specific helper methods
  public isSuperAdmin(): Observable<boolean> {
    return this.hasRole('SuperAdmin');
  }
  public isGroupAdmin(): Observable<boolean> {
    return this.hasRole('GroupAdmin');
  }
  public isRegularUser(): Observable<boolean> {
    return this.hasRole('RegularUser');
  }
  public isCommitteeMember(): Observable<boolean> {
    return this.hasRole('CommitteeMember');
  }

  /**
   * Returns the local GUID for the current user
   */
  public getUserId(): Observable<string> {
    return this.getCurrentUser().pipe(
      map((user: CurrentUser | null): string => user?.id ?? ''),
    );
  }
}
