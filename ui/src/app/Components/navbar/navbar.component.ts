import { Component } from '@angular/core';
import { LandingPageButtonsComponent } from '../landing-page-buttons/landing-page-buttons.component';

@Component({
  selector: 'app-navbar',
  imports: [LandingPageButtonsComponent],
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {}
