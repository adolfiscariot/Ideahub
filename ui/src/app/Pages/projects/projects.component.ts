import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BaseLayoutComponent } from '../../Components/base-layout/base-layout.component';
import { Project, ProjectStatus } from '../../Interfaces/Projects/Project';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EditProjectModalComponent } from '../../Components/modals/edit-project-modal/edit-project-modal.component';

@Component({
    selector: 'app-projects',
    standalone: true,
    imports: [CommonModule, BaseLayoutComponent, FormsModule, MatDialogModule],
    templateUrl: './projects.component.html',
    styleUrl: './projects.component.scss'
})
export class ProjectsComponent implements OnInit {
    projects: Project[] = [];
    ProjectStatus = ProjectStatus;

    constructor(private dialog: MatDialog) { }

    ngOnInit(): void {
        // Mock Data
        this.projects = [
            {
                id: 1,
                title: 'Community Garden Initiative',
                description: 'A project to establish a sustainable community garden for local residents to grow their own produce.',
                status: ProjectStatus.Active,
                createdAt: '2023-10-15T09:00:00Z',
                overseenBy: 'Alice Johnson',
                overseenById: 'user1'
            },
            {
                id: 2,
                title: 'Tech Education Workshop',
                description: 'Organizing a series of workshops to teach basic computer skills to the elderly in the neighborhood.',
                status: ProjectStatus.Planning,
                createdAt: '2023-11-02T14:30:00Z',
                overseenBy: 'Bob Smith',
                overseenById: 'user2'
            },
            {
                id: 3,
                title: 'River Cleanup Drive',
                description: 'A weekend event dedicated to cleaning up the riverbanks and promoting environmental awareness.',
                status: ProjectStatus.Completed,
                createdAt: '2023-09-10T08:00:00Z',
                endedAt: '2023-09-10T17:00:00Z',
                overseenBy: 'Charlie Brown',
                overseenById: 'user3'
            },
            {
                id: 4,
                title: 'Mobile Health Clinic',
                description: 'Deploying a mobile unit to provide free basic health checkups in remote areas.',
                status: ProjectStatus.Active,
                createdAt: '2023-12-01T10:00:00Z',
                overseenBy: 'Diana Ross',
                overseenById: 'user4'
            }
        ];
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

    openEditModal(project: Project): void {
        const dialogRef = this.dialog.open(EditProjectModalComponent, {
            width: '500px',
            data: { project }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                // Update the project in the list (mock update)
                const index = this.projects.findIndex(p => p.id === result.id);
                if (index !== -1) {
                    this.projects[index] = result;
                }
            }
        });
    }
}

