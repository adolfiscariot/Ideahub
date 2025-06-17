import { Component, inject, OnInit } from '@angular/core';
import { ButtonsComponent } from '../../Components/buttons/buttons.component';
import { AuthService } from '../../Services/auth/auth.service';

@Component({
  selector: 'app-register',
  imports: [ButtonsComponent],
  standalone: true,
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit{

  constructor(private authService: AuthService){}

  ngOnInit(): void {}
}
