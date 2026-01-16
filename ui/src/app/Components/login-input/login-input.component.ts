import { Component, OnInit, inject } from '@angular/core';

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
import { NotificationsService } from '../../Services/notifications';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroEnvelope, heroLockClosed, heroEye, heroEyeSlash } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-login-input',
  imports: [ButtonsComponent, RouterLink, ReactiveFormsModule, NgIconComponent],
  viewProviders: [provideIcons({ heroEnvelope, heroLockClosed, heroEye, heroEyeSlash })],
  templateUrl: './login-input.component.html',
  styleUrl: './login-input.component.scss',
})
export class LoginInputComponent implements OnInit {
  authService = inject(AuthService);
  toastService = inject(ToastService);
  notificationsService = inject(NotificationsService);
  router = inject(Router);
  isLoading = false;
  showPassword = false;
  submitted = false;

  ngOnInit(): void { this.notificationsService }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }


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
    this.submitted = true;
    console.log(`${this.loginForm.value.email} is logging in...`);

    if (this.loginForm.valid) {
      this.isLoading = true;
      const loginData: Login = this.loginForm.getRawValue();

      this.authService.login(loginData).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.toastService.show(response.message, 'success');
          this.router.navigate(['/home']);
          this.notificationsService.refreshPendingRequests();
          this.loginForm.reset();
          this.submitted = false;
        },
        error: (error) => {
          this.isLoading = false;
          this.toastService.show(error.message, 'error');
        },
      });
    } else {
      event.preventDefault();
      // Inline error messages will show via the submitted flag
    }
  }
}
