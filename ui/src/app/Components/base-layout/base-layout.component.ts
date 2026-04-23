import { Component } from '@angular/core';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  standalone: true,
  selector: 'app-base-layout',
  imports: [SidebarComponent],
  templateUrl: './base-layout.component.html',
  styleUrl: './base-layout.component.scss',
})
export class BaseLayoutComponent {}
