import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Project, ProjectStatus } from '../../../Interfaces/Projects/Project';
import { ButtonsComponent } from '../../buttons/buttons.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';
import { ToastService } from '../../../Services/toast.service';

@Component({
    selector: 'app-edit-project-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonsComponent,
        NgIconComponent
    ],
    providers: [provideIcons({ heroXMark })],
    templateUrl: './edit-project-modal.component.html',
    styleUrls: ['./edit-project-modal.component.scss']
})
export class EditProjectModalComponent implements OnInit {
    editedProject: Partial<Project> = {};
    ProjectStatus = ProjectStatus;
    statusOptions = Object.values(ProjectStatus).filter(value => typeof value === 'number') as number[];

    private toastService = inject(ToastService);

    constructor(
        public dialogRef: MatDialogRef<EditProjectModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { project: Project }
    ) { }

    ngOnInit(): void {
        // Clone the data to avoid mutating the source directly until saved
        this.editedProject = { ...this.data.project };

        // Format date for <input type="date"> (expects YYYY-MM-DD)
        if (this.editedProject.endedAt) {
            this.editedProject.endedAt = this.editedProject.endedAt.split('T')[0];
        }
    }

    getStatusLabel(status: number): string {
        return ProjectStatus[status];
    }

    onSave(): void {
        // Validation: End Date cannot be before Creation Date
        if (this.editedProject.endedAt) {
            const endDate = new Date(this.editedProject.endedAt);
            const createdDate = new Date(this.data.project.createdAt);

            // Reset hours to compare only dates
            endDate.setHours(0, 0, 0, 0);
            createdDate.setHours(0, 0, 0, 0);

            if (endDate < createdDate) {
                this.toastService.show('End date cannot be before creation date', 'error');
                return;
            }
        }

        this.dialogRef.close(this.editedProject);
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
