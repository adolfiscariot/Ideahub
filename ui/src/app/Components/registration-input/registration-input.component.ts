import { Component, OnInit, inject } from '@angular/core';

import { ButtonsComponent } from '../buttons/buttons.component';
import { AuthService } from '../../Services/auth/auth.service';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
  ValidatorFn,
  ValidationErrors,
  AbstractControl,
} from '@angular/forms';
import { Registration } from '../../Interfaces/Registration/registration-interface';
import { confirmPasswordValidator } from '../../Validators/password-match.validators';
import { Router } from '@angular/router';
import { ConfirmRegistrationComponent } from '../../Pages/confirm-registration/confirm-registration.component';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-registration-input',
  imports: [ButtonsComponent, ReactiveFormsModule, RouterLink],
  standalone: true,
  templateUrl: './registration-input.component.html',
  styleUrl: './registration-input.component.scss',
})
export class RegistrationInputComponent implements OnInit {
  authService = inject(AuthService);
  private router = inject(Router);

  serverError: string[] = [];
  isLoading = false;

  ngOnInit(): void { }

  registrationForm = new FormGroup(
    {
      displayName: new FormControl('', {
        validators: [Validators.required],
        nonNullable: true,
      }),
      email: new FormControl('', {
        validators: [Validators.required, Validators.email],
        nonNullable: true,
      }),
      password: new FormControl('', {
        validators: [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(
            '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[ !@#$%^&*()_+\\-=\\[\\]{}|\\;:\'\",.<>\\/?]).{8,}$'
          ),
        ],
        nonNullable: true,
      }),
      confirmPassword: new FormControl('', {
        validators: [Validators.required],
        nonNullable: true,
      }),
    },
    { validators: confirmPasswordValidator }
  );

  onSubmit(event: Event) {
    this.serverError = [];

    if (this.registrationForm.valid) {
      this.isLoading = true;
      const registrationData: Registration =
        this.registrationForm.getRawValue();
      this.authService.register(registrationData).subscribe({
        next: (response: any) => {
          this.isLoading = false;
          console.log(`Registration was successful: ${response.message}`);
          this.router.navigate(['/confirm-registration']);
        },
        error: (error: any) => {
          this.isLoading = false;
          console.error(`Registration unsuccessful:`, error);

          // Check if the error has a response body with an errors array
          if (error.error && error.error.errors && Array.isArray(error.error.errors)) {
            this.serverError = error.error.errors;
          }
          // Fallback for single message
          else if (error.error && error.error.message) {
            this.serverError = [error.error.message];
          }
          // Generic fallback
          else {
            this.serverError = ['Registration failed. Please try again.'];
          }
        },
      });
    } else {
      event.preventDefault();
      this.registrationForm.markAllAsTouched();
    }
  }
}
