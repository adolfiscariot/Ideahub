import { AppConfigService } from '../../core/services/app-config.service';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ApiResponse } from '../../Interfaces/Api-Response/api-response';
import { AuthService } from '../../Services/auth/auth.service';
import { AuthData } from '../../Interfaces/Auth/auth-interfaces';

@Component({
  selector: 'app-sso-login',
  standalone: true,
  imports: [],
  template: `
    <div
      style="text-align: center; margin-top: 100px; font-family: sans-serif;"
    >
      <h2 style="color: #1B467A;">Connecting to IdeaHub...</h2>
      <p>Verifying your Intranet credentials. Please wait.</p>

      @if (errorMsg) {
        <div style="color: #d9534f; margin-top: 20px;">
          <p>{{ errorMsg }}</p>
          <button
            (click)="goToLogin()"
            style="padding: 10px 20px; cursor: pointer;"
          >
            Go to Login
          </button>
        </div>
      }
    </div>
  `,
})
export class SsoLoginComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private appConfig = inject(AppConfigService);

  protected errorMsg = '';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.errorMsg = 'Token missing. Redirecting to login...';
      setTimeout(() => this.goToLogin(), 3000);
      return;
    }

    // Clear the token from the URL and browser history immediately
    history.replaceState({}, '', window.location.pathname);

    const ssoUrl = `${this.appConfig.apiUrl}/auth/sso-login`;

    this.http
      .post<ApiResponse<AuthData>>(ssoUrl, { token }, { withCredentials: true })
      .subscribe({
        next: (response) => {
          const isSuccessful = response.success || response.status;

          if (isSuccessful && response.data?.accessToken) {
            console.log('SSO: Success! Passing data to AuthService...');

            this.authService.setAuthData(response.data);

            this.router.navigate(['/home']).then((navigated) => {
              if (navigated) {
                console.log('SSO: Navigation successful!');
              } else {
                console.warn('SSO: Navigation was BLOCKED by a Guard!');
              }
            });
          } else {
            console.error('SSO: Response missing success/data');
            this.errorMsg = 'Auth failed: Response structure mismatch.';
          }
        },
        error: (err) => {
          console.error('SSO Exchange error:', err);
          this.errorMsg = 'Connection to authentication server failed.';
          setTimeout(() => this.goToLogin(), 3000);
        },
      });
  }

  protected goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
