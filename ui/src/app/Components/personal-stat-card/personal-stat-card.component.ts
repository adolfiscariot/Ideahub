import { Component, Input } from '@angular/core';

import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-personal-stat-card',
  standalone: true,
  imports: [NgIcon],
  templateUrl: './personal-stat-card.component.html',
  styleUrl: './personal-stat-card.component.scss'
})
export class PersonalStatCardComponent {
  @Input() label = '';
  @Input() value: number | string = 0;
  @Input() icon = '';
}
