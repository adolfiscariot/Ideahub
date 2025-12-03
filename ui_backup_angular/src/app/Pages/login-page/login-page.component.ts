import { Component } from '@angular/core';
import { LoginInputComponent } from '../../Components/login-input/login-input.component';

@Component({
  selector: 'app-login-page',
  imports: [LoginInputComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {}
