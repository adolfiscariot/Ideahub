import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-buttons',
  imports: [CommonModule, RouterModule],
  standalone: true,
  templateUrl: './buttons.component.html',
  styleUrl: './buttons.component.scss',
})
export class ButtonsComponent {
  @Input() buttonText = '';
  @Input() buttonStyleClass = '';
  @Input() buttonLink = '';
  @Input() buttonType: 'submit' | 'button' | 'reset' = 'button';

  // Ideas
  @Input() disabled = false;
  @Input() title = '';
  @Input() isLoading = false;
}
