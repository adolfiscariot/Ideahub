import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../Services/auth/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  template: '<p>Redirecting to login...</p>',
})
export class LoginPageComponent implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.login();
  }
}
