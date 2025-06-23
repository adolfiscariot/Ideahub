import { Component } from '@angular/core';
import { ButtonsComponent } from '../buttons/buttons.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [ButtonsComponent, RouterModule],
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  date = new Date().getFullYear();
}
