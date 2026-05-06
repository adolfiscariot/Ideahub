import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../Services/auth/auth.service';

@Component({
  selector: 'app-set-password',
  standalone: true,
  template: '<p>Redirecting...</p>',
})
export class SetPasswordComponent implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.login();
  }
}
