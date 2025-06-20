import { Component } from '@angular/core';
import { NavbarComponent } from '../../Components/navbar/navbar.component';
import { CtaComponent } from '../../Components/cta/cta.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CtaComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent {}
