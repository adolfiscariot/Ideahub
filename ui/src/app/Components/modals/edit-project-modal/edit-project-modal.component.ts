import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Project, ProjectStatus } from '../../../Interfaces/Projects/Project';

@Component({
    selector: 'app-edit-project-modal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule
    ],
    templateUrl: './edit-project-modal.component.html',
    styleUrls: ['./edit-project-modal.component.scss']
})
export class EditProjectModalComponent implements OnInit {
    editedProject: Partial<Project> = {};
    ProjectStatus = ProjectStatus;
    statusOptions = Object.values(ProjectStatus).filter(value => typeof value === 'number') as number[];

    constructor(
        public dialogRef: MatDialogRef<EditProjectModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { project: Project }
    ) { }

    ngOnInit(): void {
        // Clone the data to avoid mutating the source directly until saved
        this.editedProject = { ...this.data.project };
    }

    getStatusLabel(status: number): string {
        return ProjectStatus[status];
    }

    onSave(): void {
        this.dialogRef.close(this.editedProject);
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
