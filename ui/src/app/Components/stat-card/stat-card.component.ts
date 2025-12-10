import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, NgIcon],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss'
})
export class StatCardComponent {
  @Input() label: string = '';
  @Input() value: number | string = 0;
  @Input() icon: string = '';
  @Input() variant: string = '';
}
