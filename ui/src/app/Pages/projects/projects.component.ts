import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseLayoutComponent } from '../../Components/base-layout/base-layout.component';

@Component({
    selector: 'app-projects',
    standalone: true,
    imports: [CommonModule, BaseLayoutComponent],
    templateUrl: './projects.component.html',
    styleUrl: './projects.component.scss'
})
export class ProjectsComponent {

}
