import { Component } from '@angular/core';
import { LandingPageButtonsComponent } from '../landing-page-buttons/landing-page-buttons.component';

@Component({
  selector: 'app-cta',
  imports: [LandingPageButtonsComponent],
  standalone: true,
  templateUrl: './cta.component.html',
  styleUrl: './cta.component.scss'
})
export class CtaComponent {

}
