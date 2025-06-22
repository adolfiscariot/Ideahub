import { Component, OnInit, inject } from '@angular/core';
import { NgIf } from '@angular/common';
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
  imports: [ButtonsComponent, ReactiveFormsModule, NgIf, RouterLink],
  standalone: true,
  templateUrl: './registration-input.component.html',
  styleUrl: './registration-input.component.scss',
})
export class RegistrationInputComponent implements OnInit {
  authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {}

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
            '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[ !@#$%^&*()_+\\-=\\[\\]{}|\\;:\'",.<>\\/?]).{8,}$'
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
    if (this.registrationForm.valid) {
      const registrationData: Registration =
        this.registrationForm.getRawValue();
      this.authService.register(registrationData).subscribe({
        next: (response) => {
          console.log(`Registration was successful: ${response.message}`);
          alert('Registration was successful');
          this.router.navigate(['/confirm-registration']);
        },
        error: (errorMessage) => {
          console.error(`Registration unsuccessful: ${errorMessage.errors}`);
          alert(
            `Registration failed.${errorMessage.value || 'Please try again'}`
          );
        },
      });
      this.registrationForm.reset();
    } else {
      event.preventDefault();
      this.registrationForm.markAllAsTouched();
      alert('Please fill the form correctly');
    }
  }
}
