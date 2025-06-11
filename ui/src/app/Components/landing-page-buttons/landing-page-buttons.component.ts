import { Component, Input} from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';

@Component({
  selector: 'app-landing-page-buttons',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './landing-page-buttons.component.html',
  styleUrl: './landing-page-buttons.component.scss',
})
export class LandingPageButtonsComponent {
  @Input() buttonText: string = '';
  @Input() buttonStyleClass: string = '';
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