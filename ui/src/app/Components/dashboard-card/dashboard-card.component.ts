import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-dashboard-card',
  standalone: true,
  imports: [CommonModule, NgIcon],
  templateUrl: './dashboard-card.component.html',
  styleUrl: './dashboard-card.component.scss'
})
export class DashboardCardComponent {
  @Input() title: string = '';
  @Input() icon: string = '';
  @Input() variant: string = '';
}
