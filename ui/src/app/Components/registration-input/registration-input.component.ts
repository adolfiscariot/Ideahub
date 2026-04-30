import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../Services/auth/auth.service';

@Component({
  selector: 'app-registration-input',
  standalone: true,
  template: `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
      <div style="text-align: center;">
        <p style="font-size: 1.2rem; color: #666;">Redirecting to registration...</p>
      </div>
    </div>
  `,
})
export class RegistrationInputComponent implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.signUp();
  }
}
