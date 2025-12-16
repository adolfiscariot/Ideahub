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
import { Login } from '../../Interfaces/Login/login-interface';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-input',
  imports: [ButtonsComponent, RouterLink, ReactiveFormsModule],
  templateUrl: './login-input.component.html',
  styleUrl: './login-input.component.scss',
})
export class LoginInputComponent implements OnInit {
  authService = inject(AuthService);
  router = inject(Router);
  isLoading = false;

  ngOnInit(): void { }

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
    console.log(`${this.loginForm.value.email} is logging in...`);

    if (this.loginForm.valid) {
      this.isLoading = true;
      const loginData: Login = this.loginForm.getRawValue();

      this.authService.login(loginData).subscribe({
        next: (response) => {
          this.isLoading = false;
          console.log(response.message);
          this.router.navigate(['/home']);
          this.loginForm.reset();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Login failed: ', error.message);
          alert(error.message);
        },
      });
    } else {
      event.preventDefault();
      console.error('Please input valid data in the login form');
    }
  }
}
