import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../Services/auth/auth.service';

@Component({
  selector: 'app-registration-input',
  standalone: true,
  template: '',
})
export class RegistrationInputComponent implements OnInit {
  private readonly authService = inject(AuthService);

  ngOnInit(): void {
    this.authService.signUp();
  }
}
