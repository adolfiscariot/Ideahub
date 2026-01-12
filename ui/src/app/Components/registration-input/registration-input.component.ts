import { Component, OnInit, inject } from '@angular/core';
import { ToastService } from '../../Services/toast.service';
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
//import { ConfirmRegistrationComponent } from '../../Pages/confirm-registration/confirm-registration.component';
import { LoginPageComponent } from '../../Pages/login-page/login-page.component';
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
  isLoading = false;

  constructor(private toastService: ToastService){}

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
      this.isLoading = true;
      const registrationData: Registration =
        this.registrationForm.getRawValue();
      this.authService.register(registrationData).subscribe({
        next: (response) => {
          this.isLoading = false;
          console.log(`Registration was successful: ${response.message}`);
          this.toastService.show('Registration was successful', 'success');
          // this.router.navigate(['/confirm-registration']);
          this.router.navigate(['/login']);
          this.registrationForm.reset();
        },
        error: (error) => {
          this.isLoading = false;
          console.error(`Registration unsuccessful:`, error);
          const msg = error.message || 'Unknown error';
          this.toastService.show(`Registration failed. ${msg}`, 'error');
        },
      });
    } else {
      event.preventDefault();
      this.registrationForm.markAllAsTouched();
      this.toastService.show('Please fill the form correctly', 'info');
    }
  }
}
