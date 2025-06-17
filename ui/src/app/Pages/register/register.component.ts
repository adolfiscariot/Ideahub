import { Component } from '@angular/core';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';

@Component({
  selector: 'app-register',
  imports: [ButtonsComponent],
  standalone: true,
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {}
