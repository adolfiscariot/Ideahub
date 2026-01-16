import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Project, ProjectStatus } from '../../../Interfaces/Projects/Project';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
    heroXMark, heroUser, heroUserGroup, heroLightBulb,
    heroCalendar, heroRocketLaunch, heroPencilSquare
} from '@ng-icons/heroicons/outline';

@Component({
    selector: 'app-view-project-modal',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, NgIconComponent],
    viewProviders: [provideIcons({
        heroXMark, heroUser, heroUserGroup, heroLightBulb,
        heroCalendar, heroRocketLaunch, heroPencilSquare
    })],
    templateUrl: './view-project-modal.component.html',
    styleUrls: ['./view-project-modal.component.scss']
})
export class ViewProjectModalComponent {
    project: Project;
    canEdit: boolean;

    constructor(
        public dialogRef: MatDialogRef<ViewProjectModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { project: Project; canEdit: boolean }
    ) {
        this.project = data.project;
        this.canEdit = data.canEdit;
    }

    getStatusLabel(status: ProjectStatus): string {
        return ProjectStatus[status];
    }

    getStatusClass(status: ProjectStatus): string {
        switch (status) {
            case ProjectStatus.Planning: return 'status-planning';
            case ProjectStatus.Active: return 'status-active';
            case ProjectStatus.Completed: return 'status-completed';
            case ProjectStatus.Shelved: return 'status-shelved';
            case ProjectStatus.Cancelled: return 'status-cancelled';
            default: return '';
        }
    }

    onClose(): void {
        this.dialogRef.close();
    }

    onEdit(): void {
        this.dialogRef.close({ action: 'edit', project: this.project });
    }
}
