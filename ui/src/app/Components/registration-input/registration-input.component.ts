import { Component, OnInit, inject } from '@angular/core';
import { ToastService } from '../../Services/toast.service';
import { ButtonsComponent } from '../buttons/buttons.component';
import { AuthService } from '../../Services/auth/auth.service';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Registration } from '../../Interfaces/Registration/registration-interface';
import { confirmPasswordValidator } from '../../Validators/password-match.validators';
import { Router, RouterLink } from '@angular/router';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroUser, heroEnvelope, heroLockClosed, heroEye, heroEyeSlash } from '@ng-icons/heroicons/outline';

const PASSWORD_REQUIREMENTS = [
  { text: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { text: 'At least 1 number', test: (v: string) => /[0-9]/.test(v) },
  { text: 'At least 1 lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { text: 'At least 1 uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { text: 'At least 1 special character', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

@Component({
  selector: 'app-registration-input',
  standalone: true,
  imports: [ButtonsComponent, ReactiveFormsModule, RouterLink, CommonModule, NgIconComponent],
  viewProviders: [provideIcons({ heroUser, heroEnvelope, heroLockClosed, heroEye, heroEyeSlash })],
  templateUrl: './registration-input.component.html',
  styleUrl: './registration-input.component.scss',
})
export class RegistrationInputComponent implements OnInit {
  authService = inject(AuthService);
  router = inject(Router);
  toastService = inject(ToastService);

  isLoading = false;
  submitted = false;

  passwordFocused = false;
  passwordValue = '';
  infoHovered = false;
  showPassword = false;
  showConfirmPassword = false;
  passwordChecks = PASSWORD_REQUIREMENTS.map(r => ({
    text: r.text,
    met: false,
  }));


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

  ngOnInit(): void { }

  onPasswordInput() {
    const pwd = this.registrationForm.get('password')?.value || '';
    this.passwordValue = pwd;

    this.passwordChecks = PASSWORD_REQUIREMENTS.map(r => ({
      text: r.text,
      met: r.test(pwd),
    }));
  }

  get allPasswordMet(): boolean {
    return this.passwordChecks.every(r => r.met);
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  get passwordStrength(): number {
    return this.passwordChecks.filter(r => r.met).length;
  }

  onSubmit(event: Event) {
    this.submitted = true;

    if (this.registrationForm.valid) {
      this.isLoading = true;
      const registrationData: Registration =
        this.registrationForm.getRawValue();

      this.authService.register(registrationData).subscribe({
        next: () => {
          this.isLoading = false;
          this.toastService.show('Registration was successful', 'success');
          this.router.navigate(['/login']);
          this.registrationForm.reset();
          this.submitted = false;
        },
        error: (error) => {
          this.isLoading = false;
          this.toastService.show(
            `Registration failed. ${error.message || 'Unknown error'}`,
            'error'
          );
        },
      });
    } else {
      event.preventDefault();
      // Inline errors will show via submitted flag
    }
  }
}
