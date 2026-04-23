import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

const PASSWORD_REQUIREMENTS = [
  { text: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { text: 'At least 1 number', test: (v: string) => /[0-9]/.test(v) },
  { text: 'At least 1 lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { text: 'At least 1 uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  {
    text: 'At least 1 special character',
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
];

@Component({
  selector: 'app-password-requirements',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './password-requirements.component.html',
  styleUrls: ['./password-requirements.component.scss'],
})
export class PasswordRequirementsComponent {
  @Input() password = '';

  infoHovered = false;

  get checks() {
    return PASSWORD_REQUIREMENTS.map((r) => ({
      text: r.text,
      met: r.test(this.password),
    }));
  }

  get strength() {
    return this.checks.filter((c) => c.met).length;
  }

  get allMet() {
    return this.strength === PASSWORD_REQUIREMENTS.length;
  }
}
