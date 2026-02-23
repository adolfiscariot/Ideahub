import { Component } from '@angular/core';
import { RegistrationInputComponent } from '../../Components/registration-input/registration-input.component';

@Component({
  selector: 'app-register',
  imports: [RegistrationInputComponent],
  standalone: true,
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent { }
