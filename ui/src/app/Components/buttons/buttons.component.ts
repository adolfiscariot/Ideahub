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
}

//@Input is a decorator, just like @property in Python.
//It adds functionality to a method by adding metadata
//The input decorator tells the compiler "hey, this
// element expects to be fed data by its parent"
//to an element, telling the compiler how to treat it.
//NgClass is a directive (used to manipulate the
//behavior or structure of an element) used to add or
//remove styling
//to an element
