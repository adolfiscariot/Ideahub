import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../Services/auth/auth.service';

@Component({
  selector: 'app-password-nag-banner',
  standalone: true,
  imports: [AsyncPipe, RouterModule],
  template: `
    @if (authService.passwordSetupRequired$ | async) {
      <div class="nag-banner">
        <div class="banner-content">
           <p>
             🔒 <strong>Secure your access:</strong> You're currently signed in via the Intranet. 
             Set a password to ensure you can login to IdeaHub independently, using the password you set and your Intranet email.
           </p>
           <a routerLink="/set-password" class="setup-btn">Set a Password</a>
        </div>
      </div>
    }
  `,
  styles: [`
    .nag-banner {
      background: linear-gradient(90deg, #ff8c00 0%, #ff4500 100%);
      color: white;
      padding: 12px 20px;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      position: relative;
      z-index: 1001;
    }
    .banner-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 15px;
      justify-content: center;
    }
    .icon {
      font-size: 20px;
    }
    p {
      margin: 0;
      line-height: 1.4;
    }
    .setup-btn {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s ease;
      white-space: nowrap;
      border: 1px solid rgba(255, 255, 255, 0.4);
    }
    .setup-btn:hover {
      background: white;
      color: #ff4500;
      transform: translateY(-1px);
    }
    @media (max-width: 768px) {
      .banner-content {
        flex-direction: column;
        text-align: center;
        gap: 10px;
      }
    }
  `]
})
export class PasswordNagBannerComponent {
  authService = inject(AuthService);
}
