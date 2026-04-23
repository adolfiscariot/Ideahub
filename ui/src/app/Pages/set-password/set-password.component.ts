import { Component, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../Services/auth/auth.service';
import { ToastService } from '../../Services/toast.service';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';
import { PasswordRequirementsComponent } from '../../Components/password-requirements/password-requirements.component';

@Component({
  selector: 'app-set-password',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonsComponent, PasswordRequirementsComponent],
  template: `
    <div class="set-password-container">
      <div class="card">
        <h2>Setup Password</h2>
        <form [formGroup]="setPasswordForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <div class="label-with-info">
              <label for="password">New Password</label>
              <app-password-requirements [password]="setPasswordForm.get('password')?.value || ''" />
            </div>
            <input 
              type="password" 
              id="password" 
              formControlName="password" 
              placeholder="Minimum 8 characters"
              class="form-control"
            >
            @if (setPasswordForm.get('password')?.touched && setPasswordForm.get('password')?.invalid) {
              <div class="error">
                Password must be at least 8 characters.
              </div>
            }
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input 
              type="password" 
              id="confirmPassword" 
              formControlName="confirmPassword" 
              placeholder="Repeat password"
              class="form-control"
            >
            @if (setPasswordForm.get('confirmPassword')?.touched && setPasswordForm.errors?.['mismatch']) {
              <div class="error">
                Passwords do not match.
              </div>
            }
          </div>

          <div class="actions">
            <app-buttons 
              [buttonText]="isSubmitting ? 'Saving...' : 'Set Password'" 
              [buttonType]="'submit'" 
              [disabled]="setPasswordForm.invalid || isSubmitting"
            />
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .set-password-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 20px;
      background-color: #f8f9fa;
    }
    .card {
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      max-width: 450px;
      width: 100%;
    }
    h2 {
      color: #1B467A;
      margin-top: 0;
      margin-bottom: 10px;
      text-align: center;
    }
    .subtitle {
      color: #666;
      font-size: 14px;
      text-align: center;
      margin-bottom: 30px;
      line-height: 1.5;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .label-with-info {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
    }
    label {
      display: block;
      margin-bottom: 0;
      font-weight: 600;
      color: #444;
    }
    .form-control {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      transition: border-color 0.2s;
    }
    .form-control:focus {
      outline: none;
      border-color: #1B467A;
    }
    .error {
      color: #d9534f;
      font-size: 12px;
      margin-top: 5px;
    }
    .actions {
      margin-top: 30px;
    }
    ::ng-deep app-buttons button {
      width: 100% !important;
    }
  `]
})
export class SetPasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  isSubmitting = false;

  setPasswordForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  passwordMatchValidator(g: AbstractControl) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  onSubmit() {
    if (this.setPasswordForm.valid) {
      this.isSubmitting = true;
      const password = this.setPasswordForm.value.password!;

      this.authService.setInitialPassword(password).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          if (res.success) {
            this.toastService.show('Password set successfully! You can now use it to log in.', 'success');
            this.router.navigate(['/home']);
          } else {
            this.toastService.show(res.message || 'Failed to set password', 'error');
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          this.toastService.show(err.message || 'An error occurred', 'error');
        }
      });
    }
  }
}
