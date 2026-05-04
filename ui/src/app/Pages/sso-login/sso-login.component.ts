// import { AppConfigService } from '../../core/services/app-config.service';
import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../Services/auth/auth.service';

@Component({
  selector: 'app-sso-login',
  standalone: true,
  template: '<p>Redirecting to login...</p>',
})
export class SsoLoginComponent implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.login();
  }
}
