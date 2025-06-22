import { Component, inject, OnInit } from '@angular/core';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';
import { AuthService } from '../../Services/auth/auth.service';
import { RegistrationInputComponent } from '../../Components/registration-input/registration-input.component';

@Component({
  selector: 'app-register',
  imports: [RegistrationInputComponent],
  standalone: true,
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {}
