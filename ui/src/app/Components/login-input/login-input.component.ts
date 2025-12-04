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

  ngOnInit(): void {}

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
      const loginData: Login = this.loginForm.getRawValue();

      this.authService.login(loginData).subscribe({
        next: (response) => {
          console.log(response.message);
          this.router.navigate(['/home']);
        },
        error: (error) => {
          console.error('Login failed: ', error.message);
          alert(error.message);
          throw new Error(error.message);
        },
      });

      this.loginForm.reset();
    } else {
      event.preventDefault();
      console.error('Please input valid data in the login form');
    }
  }
}
