import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../Services/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

  passwordChecks = [
    
    { text: 'At least 8 characters', met: false },
    { text: 'Contains a lowercase letter', met: false },
    { text: 'Contains an uppercase letter', met: false },
    { text: 'Contains a number', met: false },
    { text: 'Contains a special character', met: false }
  ];

passwordStrength = 0;


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
    });
  }

  
  submit() {
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
        this.error = err.message || 'Request failed';
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
      },
      error: () => {
        this.error = 'Invalid or expired code';
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
        this.error = err.message || 'Reset failed';
      }
    });
  }

  onPasswordInput() {
  const pw = this.form.get('newPassword')?.value || '';

  this.passwordChecks[0].met = pw.length >= 8;
  this.passwordChecks[1].met = /[a-z]/.test(pw);
  this.passwordChecks[2].met = /[A-Z]/.test(pw);
  this.passwordChecks[3].met = /[0-9]/.test(pw);
  this.passwordChecks[4].met = /[^A-Za-z0-9]/.test(pw);

  // Strength = number of rules met
  this.passwordStrength = this.passwordChecks.filter(r => r.met).length;
}

}
