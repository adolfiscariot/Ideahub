import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../Services/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  template: '<p>Redirecting to signup...</p>',
})
export class RegisterComponent implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.signUp();
  }
}
