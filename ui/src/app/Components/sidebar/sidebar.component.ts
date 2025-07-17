import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';    
import { MatButtonModule } from '@angular/material/button';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  imports: [MatIconModule, MatButtonModule, NgClass],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  isSidebarExpanded: boolean = false;

  toggleSidebar(){
    this.isSidebarExpanded = !this.isSidebarExpanded;
    console.log("The state is: %s", this.isSidebarExpanded);
  }
}
