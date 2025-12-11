import { Component, Input } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-buttons',
  imports: [CommonModule, RouterModule],
  standalone: true,
  templateUrl: './buttons.component.html',
  styleUrl: './buttons.component.scss',
})
export class ButtonsComponent {
  @Input() buttonText: string = '';
  @Input() buttonStyleClass: string = '';
  @Input() buttonLink: string = '';
  @Input() buttonType: 'submit' | 'button' | 'reset' = 'button';
 
  // Ideas
  @Input() disabled: boolean = false;
  @Input() title: string = ''; 
}
