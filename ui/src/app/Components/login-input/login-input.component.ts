import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../Services/auth/auth.service';

@Component({
  selector: 'app-login-input',
  standalone: true,
  template: '',
})
export class LoginInputComponent implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.login();
  }
}
