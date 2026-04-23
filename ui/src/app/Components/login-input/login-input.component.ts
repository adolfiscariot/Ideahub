import { Component, inject } from '@angular/core';

import { ButtonsComponent } from '../buttons/buttons.component';
import { RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormControl,
  Validators,
  FormGroup,
} from '@angular/forms';
import { AuthService } from '../../Services/auth/auth.service';
import { ToastService } from '../../Services/toast.service';
import { Login } from '../../Interfaces/Login/login-interface';
import { Router } from '@angular/router';
import { MembershipNotificationsService } from '../../Services/membership-notifications.service';
import { SignalrService } from '../../Services/signalr.service';

@Component({
  selector: 'app-login-input',
  imports: [ButtonsComponent, RouterLink, ReactiveFormsModule],
  templateUrl: './login-input.component.html',
  styleUrl: './login-input.component.scss',
})
export class LoginInputComponent {
  authService = inject(AuthService);
  toastService = inject(ToastService);
  membershipNotificationsService = inject(MembershipNotificationsService);
  router = inject(Router);
  isLoading = false;
  signalRService = inject(SignalrService);

  loginForm = new FormGroup({
    email: new FormControl('', {
      validators: [Validators.required, Validators.email],
      nonNullable: true,
    }),
    password: new FormControl('', {
      validators: [Validators.required],
      nonNullable: true,
    }),
  });

  onSubmit(event: Event) {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const loginData: Login = this.loginForm.getRawValue();

      this.authService.login(loginData).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.toastService.show(response.message, 'success');
          setTimeout(() => {
            this.signalRService.startConnection();
          }, 50);
          this.router.navigate(['/home']);
          this.membershipNotificationsService.refreshPendingRequests();
          this.loginForm.reset();
        },
        error: (error) => {
          this.isLoading = false;
          this.toastService.show(error.message, 'error');
        },
      });
    } else {
      event.preventDefault();
      this.toastService.show(
        'Please input valid data in the login form',
        'warning',
      );
    }
  }
}
