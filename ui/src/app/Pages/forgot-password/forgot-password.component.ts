import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../Services/auth/auth.service';
import { PasswordRequirementsComponent } from '../../Components/password-requirements/password-requirements.component';
import { passwordMatchValidator } from '../../Components/utils/password-match.util';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PasswordRequirementsComponent],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent implements OnInit {
  form!: FormGroup;

  message = '';
  error = '';
  step: 'email' | 'code' | 'reset' | 'done' = 'email';
  resetCode = '';
  infoHovered = false;
  password = '';

  constructor(private fb: FormBuilder, private auth: AuthService) {}

  ngOnInit(): void {
    this.buildEmailForm();
  }

  buildEmailForm() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  buildCodeForm() {
    this.form = this.fb.group({
      code: ['', Validators.required]
    });
  }

  buildResetForm() {
    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required] 
    },
  { validators: passwordMatchValidator}
    );
  }
  
  clearMessages() {
    this.error = '';
    this.message = '';
  }
  
  submit() {

  this.clearMessages();

    if (this.step === 'email') {
      this.sendEmail();
    } else if (this.step === 'code') {
      this.validateCode();
    } else if (this.step === 'reset') {
      this.resetPassword();
    }
  }

  sendEmail() {
    if (this.form.invalid) return;

    this.auth.forgotPassword({ email: this.form.value.email }).subscribe({
      next: () => {
        this.message = 'If an account exists, a reset code has been sent.';
        setTimeout(() => {
          this.step = 'code';
          this.buildCodeForm();  
          this.message = '';
        }, 5000);
      },
      error: (err) => {
        this.error = this.handleBackendError(err);
      }
    });
  }

  validateCode() {
    const code = this.form.value.code;
    if (!code) return;

    this.auth.validateResetCode(code).subscribe({
      next: () => {
        this.resetCode = code;
        this.step = 'reset';
        this.buildResetForm();  
        this.clearMessages();
      },
      error: (err) => {
        this.error = this.handleBackendError(err);
      }
    });
  }

  resetPassword() {
    const { newPassword, confirmPassword } = this.form.value;

    this.auth.resetPassword({
      code: this.resetCode,
      newPassword,
      confirmPassword
    }).subscribe({
      next: () => {
        this.step = 'done';
        this.message = 'Password reset successful. You can now log in.';
      },
      error: (err) => {
        this.error = this.handleBackendError(err);
      }
    });
  }

  private handleBackendError(err: any) {
  const backend = err.error;

  // ModelState errors (ASP.NET Core)
  if (backend?.errors) {
    const firstKey = Object.keys(backend.errors)[0];
    const errorValue = backend.errors[firstKey];
    return Array.isArray(errorValue) ? errorValue[0] : errorValue;

  }

  // // 2Backend provided a message
  // if (backend?.message) {
  //   return backend.message;
  // }

  // Angular HttpClient generic error
  if (err.status === 0) {
    return 'Unable to reach the server. Please try again.';
  }

  // Fallback
  return 'Something went wrong. Please try again.';
}

}
